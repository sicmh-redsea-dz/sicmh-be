import { Router } from 'express'
import { SettingsController } from '../controllers/settings.controller'
import { AttachmentsController } from '../controllers/attachments.controller'
import { ClinicalDocumentsController } from '../controllers/clinical-documents.controller'
import { requireAnyPermission, requirePermissions } from '../middlewares/permission.middleware'
import { singleFileUpload } from '../middlewares/upload.middleware'
import { validateChangeUserPassword } from '../validators/settings.validator'

const router = Router()
const settingsController = new SettingsController()
const attachmentsController = new AttachmentsController()
const clinicalDocumentsController = new ClinicalDocumentsController()

router.get(
  '/profile',
  requireAnyPermission(['settings.profile.read', 'dashboard.view']),
  settingsController.getProfile.bind(settingsController)
)

router.patch(
  '/profile',
  requireAnyPermission(['settings.profile.update', 'dashboard.view']),
  settingsController.updateProfile.bind(settingsController)
)

router.get(
  '/company',
  requireAnyPermission(['settings.company.read', 'settings.company.update', 'settings.permissions.manage']),
  settingsController.getCompany.bind(settingsController)
)

router.patch(
  '/company',
  requireAnyPermission(['settings.company.update', 'settings.permissions.manage']),
  settingsController.updateCompany.bind(settingsController)
)

router.get(
  '/roles',
  requireAnyPermission(['settings.staff.read', 'settings.permissions.manage']),
  settingsController.listRoles.bind(settingsController)
)

router.get(
  '/users',
  requireAnyPermission(['settings.staff.read', 'settings.permissions.manage']),
  settingsController.listUsers.bind(settingsController)
)

router.post(
  '/users',
  requireAnyPermission(['settings.staff.update', 'settings.permissions.manage']),
  settingsController.inviteUser.bind(settingsController)
)

router.patch(
  '/users/:id/role',
  requireAnyPermission(['settings.staff.update', 'settings.permissions.manage']),
  settingsController.updateUserRole.bind(settingsController)
)

router.delete(
  '/users/:id',
  requireAnyPermission(['settings.staff.update', 'settings.permissions.manage']),
  settingsController.deleteUser.bind(settingsController)
)

router.patch(
  '/users/:id/password',
  requireAnyPermission(['settings.staff.update', 'settings.permissions.manage']),
  validateChangeUserPassword,
  settingsController.changeUserPassword.bind(settingsController)
)

router.get(
  '/permissions/roles',
  requireAnyPermission(['settings.permissions.read', 'settings.permissions.manage']),
  settingsController.getRolePermissions.bind(settingsController)
)

router.patch(
  '/permissions/roles/:roleKey',
  requireAnyPermission(['settings.permissions.update', 'settings.permissions.manage']),
  settingsController.updateRolePermissions.bind(settingsController)
)

router.get(
  '/permissions/users',
  requireAnyPermission(['settings.permissions.read', 'settings.permissions.manage']),
  settingsController.getUserPermissions.bind(settingsController)
)

router.patch(
  '/permissions/users/:userId',
  requireAnyPermission(['settings.permissions.update', 'settings.permissions.manage']),
  settingsController.updateUserPermissions.bind(settingsController)
)

router.post(
  '/logo',
  requireAnyPermission(['settings.company.update', 'settings.permissions.manage']),
  singleFileUpload('file'),
  attachmentsController.uploadLogo.bind(attachmentsController)
)

router.post(
  '/prescription-assets/:type',
  requireAnyPermission(['settings.profile.update', 'settings.permissions.manage']),
  singleFileUpload('file'),
  attachmentsController.uploadPrescriptionAsset.bind(attachmentsController)
)

router.get(
  '/consents',
  requireAnyPermission(['settings.company.read', 'settings.company.update', 'settings.permissions.manage']),
  clinicalDocumentsController.listTemplates.bind(clinicalDocumentsController)
)

router.post(
  '/consents',
  requireAnyPermission(['settings.company.update', 'settings.permissions.manage']),
  clinicalDocumentsController.createTemplate.bind(clinicalDocumentsController)
)

router.put(
  '/consents/:id',
  requireAnyPermission(['settings.company.update', 'settings.permissions.manage']),
  clinicalDocumentsController.updateTemplate.bind(clinicalDocumentsController)
)

router.patch(
  '/consents/:id/status',
  requireAnyPermission(['settings.company.update', 'settings.permissions.manage']),
  clinicalDocumentsController.setTemplateStatus.bind(clinicalDocumentsController)
)

export { router as settingsRoutes }
