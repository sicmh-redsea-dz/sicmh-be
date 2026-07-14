import { Router } from 'express'
import { AttachmentsController } from '../controllers/attachments.controller'
import { requirePermissions } from '../middlewares/permission.middleware'

const router = Router()
const attachmentsController = new AttachmentsController()

router.get(
  '/:id/view',
  requirePermissions('attachments.read'),
  attachmentsController.view.bind(attachmentsController)
)

router.get(
  '/:id/download',
  requirePermissions('attachments.read'),
  attachmentsController.download.bind(attachmentsController)
)

router.delete(
  '/:id',
  requirePermissions('attachments.delete'),
  attachmentsController.softDelete.bind(attachmentsController)
)

export { router as attachmentsRoutes }
