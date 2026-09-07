import { Router } from 'express';
import { AttachmentCaptureController } from '../controllers/attachment-capture.controller';
import { publicSingleFileUpload } from '../middlewares/upload.middleware';

const router = Router();
const attachmentCaptureController = new AttachmentCaptureController()

router.get('/ping', (req, res) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() })
})

router.get('/attachment-capture/:token', attachmentCaptureController.page.bind(attachmentCaptureController))
router.post('/attachment-capture/:token', publicSingleFileUpload('file'), attachmentCaptureController.upload.bind(attachmentCaptureController))

export { router as publicRoutes };
