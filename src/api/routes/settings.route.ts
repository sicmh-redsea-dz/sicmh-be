import { Router } from 'express'
import { SettingsController } from '../controllers/settings.controller'
import { requirePermissions } from '../middlewares/permission.middleware'

const router = Router()
const settingsController = new SettingsController()

router.get(
  '/profile',
  requirePermissions('dashboard.view'),
  settingsController.getProfile.bind(settingsController)
)

router.patch(
  '/profile',
  requirePermissions('dashboard.view'),
  settingsController.updateProfile.bind(settingsController)
)

router.get(
  '/roles',
  requirePermissions('settings.permissions.manage'),
  settingsController.listRoles.bind(settingsController)
)

router.get(
  '/users',
  requirePermissions('settings.permissions.manage'),
  settingsController.listUsers.bind(settingsController)
)

router.post(
  '/users',
  requirePermissions('settings.permissions.manage'),
  settingsController.inviteUser.bind(settingsController)
)

router.patch(
  '/users/:id/role',
  requirePermissions('settings.permissions.manage'),
  settingsController.updateUserRole.bind(settingsController)
)

router.delete(
  '/users/:id',
  requirePermissions('settings.permissions.manage'),
  settingsController.deleteUser.bind(settingsController)
)

router.patch(
  '/users/:id/password',
  requirePermissions('settings.permissions.manage'),
  settingsController.changeUserPassword.bind(settingsController)
)

router.get(
  '/permissions/roles',
  requirePermissions('settings.permissions.manage'),
  settingsController.getRolePermissions.bind(settingsController)
)

router.patch(
  '/permissions/roles/:roleKey',
  requirePermissions('settings.permissions.manage'),
  settingsController.updateRolePermissions.bind(settingsController)
)

router.get(
  '/permissions/users',
  requirePermissions('settings.permissions.manage'),
  settingsController.getUserPermissions.bind(settingsController)
)

router.patch(
  '/permissions/users/:userId',
  requirePermissions('settings.permissions.manage'),
  settingsController.updateUserPermissions.bind(settingsController)
)

export { router as settingsRoutes }
