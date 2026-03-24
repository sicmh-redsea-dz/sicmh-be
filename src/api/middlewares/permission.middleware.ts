import { NextFunction, Request, Response } from 'express'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { Permission } from '../permissions/permissions'

const resolveUser = async (req: Request) => {
  const currentUser = (req as any).currentUser
  if (currentUser) return currentUser

  const decoded = (req as any).user
  const uid = decoded?.uid
  if (!uid) return null

  const authService = ServiceContainer.getAuthService()
  return await authService.checkToken(uid)
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

      const accessControl = ServiceContainer.getAccessControlService()
      const permissions = await accessControl.resolvePermissions(user.roles ?? [], Number(user._id))
      const allowed = requiredList.every((permission) => permissions.has(permission))

      if (!allowed) {
        res.status(403).json({ message: 'Access denied. Insufficient permissions.' })
        return
      }

      next()
    } catch (error) {
      res.status(403).json({ message: 'Access denied. Unable to validate permissions.' })
    }
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

      const accessControl = ServiceContainer.getAccessControlService()
      const permissions = await accessControl.resolvePermissions(user.roles ?? [], Number(user._id))
      const allowed = requiredList.some((permission) => permissions.has(permission))

      if (!allowed) {
        res.status(403).json({ message: 'Access denied. Insufficient permissions.' })
        return
      }

      next()
    } catch (error) {
      res.status(403).json({ message: 'Access denied. Unable to validate permissions.' })
    }
  }
}
