import { Router } from 'express';
import { param } from 'express-validator';
import { AttachmentCaptureController } from '../controllers/attachment-capture.controller';
import { handleValidationErrors } from '../validators/validationErrorHandler';

const router = Router();
const attachmentCaptureController = new AttachmentCaptureController();
const validateCaptureToken = [param('token').isUUID().withMessage('El token de captura no es válido.'), handleValidationErrors]

router.get('/ping', (req, res) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() })
})

router.get('/attachment-capture/:token', validateCaptureToken, attachmentCaptureController.page.bind(attachmentCaptureController))
router.post('/attachment-capture/:token', validateCaptureToken, attachmentCaptureController.upload.bind(attachmentCaptureController))

export { router as publicRoutes };
