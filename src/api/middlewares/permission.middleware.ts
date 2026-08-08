import { NextFunction, Request, Response } from 'express'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { Permission } from '../permissions/permissions'

type VisitPermissionAction = 'read' | 'update'
type VisitOriginSource = 'query' | 'body' | 'id' | 'module' | 'operating-room'

const VISIT_PERMISSION_PREFIX: Record<string, string> = {
  visits: 'outpatient',
  consulta: 'outpatient',
  emergency: 'emergency',
  emergencia: 'emergency',
  hospitalization: 'hospitalization',
  hospitalizacion: 'hospitalization',
  oroom: 'operating_room',
  'o-room': 'operating_room',
  quirofano: 'operating_room'
}

const normalizeOrigin = (value: unknown): string => String(value ?? '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

const permissionForVisitOrigin = (origin: unknown, action: VisitPermissionAction): Permission | null => {
  const prefix = VISIT_PERMISSION_PREFIX[normalizeOrigin(origin)]
  return prefix ? `visits.${prefix}.${action}` as Permission : null
}

const resolveUser = async (req: Request) => {
  const currentUser = (req as any).currentUser
  if (currentUser) return currentUser

  const decoded = (req as any).user
  const uid = decoded?.uid
  if (!uid) return null

  const authService = ServiceContainer.getAuthService()
  return await authService.checkToken(Number(uid))
}

// checkToken() already resolves and attaches permissions once; reuse that
// instead of re-querying the permission-override tables a second time.
const resolveUserPermissions = async (user: any): Promise<Set<Permission>> => {
  if (Array.isArray(user.permissions)) return new Set(user.permissions)
  const accessControl = ServiceContainer.getAccessControlService()
  return accessControl.resolvePermissions(user.roles ?? [], Number(user._id))
}

export const requirePermissions = (required: Permission | Permission[]) => {
  const requiredList = Array.isArray(required) ? required : [required]

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await resolveUser(req)
      if (!user) {
        res.status(403).json({ message: 'Access denied. User not found.' })
        return
      }

      ;(req as any).currentUser = user

      const permissions = await resolveUserPermissions(user)
      const allowed = requiredList.every((permission) => permissions.has(permission))

      if (!allowed) {
        res.status(403).json({ message: 'Access denied. Insufficient permissions.' })
        return
      }

      next()
    } catch (error) {
      console.error('[requirePermissions] error:', error)
      res.status(500).json({ message: 'Unable to validate permissions. Please try again.' })
    }
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
    try {
      const user = await resolveUser(req)
      if (!user) {
        res.status(403).json({ message: 'Access denied. User not found.' })
        return
      }

      ;(req as any).currentUser = user

      const permissions = await resolveUserPermissions(user)
      const allowed = requiredList.some((permission) => permissions.has(permission))

      if (!allowed) {
        res.status(403).json({ message: 'Access denied. Insufficient permissions.' })
        return
      }

      next()
    } catch (error) {
      console.error('[requireAnyPermission] error:', error)
      res.status(500).json({ message: 'Unable to validate permissions. Please try again.' })
    }
  }
}

export const requireVisitOriginPermission = (
  action: VisitPermissionAction,
  source: VisitOriginSource
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await resolveUser(req)
      if (!user) {
        res.status(403).json({ message: 'Access denied. User not found.' })
        return
      }
      ;(req as any).currentUser = user

      let origin: unknown
      if (source === 'query') origin = req.query.ext || 'visits'
      if (source === 'body') origin = req.body?.origin
      if (source === 'module') origin = req.params.module
      if (source === 'operating-room') origin = 'oroom'
      if (source === 'id') {
        const result = await ServiceContainer.getVisitsService().findVisitById(Number(req.params.id))
        origin = result?.visit?.visitType
      }

      const required = permissionForVisitOrigin(origin, action)
      if (!required) {
        res.status(400).json({ message: 'Unable to determine the medical care module.' })
        return
      }
      ;(req as any).visitOrigin = normalizeOrigin(origin)

      const permissions = await resolveUserPermissions(user)
      if (!permissions.has(required)) {
        res.status(403).json({ message: 'Access denied. Insufficient permissions.' })
        return
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}
