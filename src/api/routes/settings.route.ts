import { Router } from 'express'
import { SettingsController } from '../controllers/settings.controller'
import { AttachmentsController } from '../controllers/attachments.controller'
import { requireAnyPermission, requirePermissions } from '../middlewares/permission.middleware'
import { singleFileUpload } from '../middlewares/upload.middleware'
import { validateChangeUserPassword } from '../validators/settings.validator'

const router = Router()
const settingsController = new SettingsController()
const attachmentsController = new AttachmentsController()

router.get(
  '/profile',
  requirePermissions('settings.profile.read'),
  settingsController.getProfile.bind(settingsController)
)

router.patch(
  '/profile',
  requirePermissions('settings.profile.update'),
  settingsController.updateProfile.bind(settingsController)
)

router.get(
  '/roles',
  requireAnyPermission(['settings.staff.read', 'settings.permissions.read']),
  settingsController.listRoles.bind(settingsController)
)

router.get(
  '/users',
  requireAnyPermission(['settings.staff.read', 'settings.permissions.read']),
  settingsController.listUsers.bind(settingsController)
)

router.post(
  '/users',
  requirePermissions('settings.staff.update'),
  settingsController.inviteUser.bind(settingsController)
)

router.patch(
  '/users/:id/role',
  requirePermissions('settings.staff.update'),
  settingsController.updateUserRole.bind(settingsController)
)

router.delete(
  '/users/:id',
  requirePermissions('settings.staff.update'),
  settingsController.deleteUser.bind(settingsController)
)

router.patch(
  '/users/:id/password',
  requirePermissions('settings.staff.update'),
  validateChangeUserPassword,
  settingsController.changeUserPassword.bind(settingsController)
)

router.get(
  '/permissions/roles',
  requirePermissions('settings.permissions.read'),
  settingsController.getRolePermissions.bind(settingsController)
)

router.patch(
  '/permissions/roles/:roleKey',
  requirePermissions('settings.permissions.update'),
  settingsController.updateRolePermissions.bind(settingsController)
)

router.get(
  '/permissions/users',
  requirePermissions('settings.permissions.read'),
  settingsController.getUserPermissions.bind(settingsController)
)

router.patch(
  '/permissions/users/:userId',
  requirePermissions('settings.permissions.update'),
  settingsController.updateUserPermissions.bind(settingsController)
)

router.post(
  '/logo',
  requirePermissions('settings.company.update'),
  singleFileUpload('file'),
  attachmentsController.uploadLogo.bind(attachmentsController)
)

router.get(
  '/company',
  requirePermissions('settings.company.read'),
  settingsController.getCompany.bind(settingsController)
)

router.patch(
  '/company',
  requirePermissions('settings.company.update'),
  settingsController.updateCompany.bind(settingsController)
)

router.post(
  '/prescription-assets/:type',
  requirePermissions('settings.profile.update'),
  singleFileUpload('file'),
  attachmentsController.uploadPrescriptionAsset.bind(attachmentsController)
)

export { router as settingsRoutes }
