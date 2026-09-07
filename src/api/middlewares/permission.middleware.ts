import { NextFunction, Request, Response } from 'express'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { Permission } from '../permissions/permissions'

type RequiredPermissions = Permission | Permission[] | null | undefined
type PermissionMatchMode = 'all' | 'any'
type PermissionResolver = (req: Request) => RequiredPermissions

const resolveUser = async (req: Request) => {
  const currentUser = (req as any).currentUser
  if (currentUser) return currentUser

  const decoded = (req as any).user
  const uid = decoded?.uid
  if (!uid) return null

  const authService = ServiceContainer.getAuthService()
  return await authService.checkToken(String(uid))
}

// checkToken() already resolves and attaches permissions once; reuse that
// instead of re-querying the permission-override tables a second time.
const resolveUserPermissions = async (user: any): Promise<Set<Permission>> => {
  if (Array.isArray(user.permissions)) return new Set(user.permissions)
  const accessControl = ServiceContainer.getAccessControlService()
  return accessControl.resolvePermissions(user.roles ?? [], String(user._id))
}

const toPermissionList = (required: RequiredPermissions): Permission[] => {
  if (!required) return []
  return Array.isArray(required) ? required : [required]
}

const validatePermissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
  requiredList: Permission[],
  mode: PermissionMatchMode
) => {
  try {
    const user = await resolveUser(req)
    if (!user) {
      res.status(403).json({ message: 'Access denied. User not found.' })
      return
    }

    ;(req as any).currentUser = user

    const permissions = await resolveUserPermissions(user)
    const allowed = mode === 'all'
      ? requiredList.every((permission) => permissions.has(permission))
      : requiredList.some((permission) => permissions.has(permission))

    if (!allowed) {
      res.status(403).json({ message: 'Access denied. Insufficient permissions.' })
      return
    }

    next()
  } catch (error) {
    const label = mode === 'all' ? 'requirePermissions' : 'requireAnyPermission'
    console.error(`[${label}] error:`, error)
    res.status(500).json({ message: 'Unable to validate permissions. Please try again.' })
  }
}

const buildResolvedPermissionGuard = (
  resolver: PermissionResolver,
  mode: PermissionMatchMode,
  fallback?: RequiredPermissions
) => {
  const fallbackList = toPermissionList(fallback)

  return async (req: Request, res: Response, next: NextFunction) => {
    const resolved = toPermissionList(resolver(req))
    const requiredList = resolved.length > 0 ? resolved : fallbackList

    if (requiredList.length === 0) {
      next()
      return
    }

    await validatePermissions(req, res, next, requiredList, mode)
  }
}

export const requirePermissions = (required: Permission | Permission[]) => {
  const requiredList = Array.isArray(required) ? required : [required]
  return async (req: Request, res: Response, next: NextFunction) => {
    await validatePermissions(req, res, next, requiredList, 'all')
  }
}

export const requirePermissionsIf = (
  predicate: (req: Request) => boolean,
  required: Permission | Permission[]
) => {
  const guard = requirePermissions(required)

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!predicate(req)) {
      next()
      return
    }
    await guard(req, res, next)
  }
}

export const requireAnyPermission = (required: Permission | Permission[]) => {
  const requiredList = Array.isArray(required) ? required : [required]
  return async (req: Request, res: Response, next: NextFunction) => {
    await validatePermissions(req, res, next, requiredList, 'any')
  }
}

export const requireResolvedPermissions = (
  resolver: PermissionResolver,
  fallback?: RequiredPermissions
) => buildResolvedPermissionGuard(resolver, 'all', fallback)

export const requireResolvedAnyPermission = (
  resolver: PermissionResolver,
  fallback?: RequiredPermissions
) => buildResolvedPermissionGuard(resolver, 'any', fallback)
