import { Router } from 'express';
import { PatientsController } from '../controllers/patients.controller';
import { validateImageCaptureToken, validateImageCaptureUpload } from '../validators/patients.validator';

const router = Router();

const patientController = new PatientsController();

router.get('/ping', (req, res) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() })
})

router.get(
  '/patients/image-capture/:token',
  validateImageCaptureToken,
  patientController.renderImageCapturePage.bind(patientController)
);

router.post(
  '/patients/image-capture/:token',
  validateImageCaptureUpload,
  patientController.uploadImageCapture.bind(patientController)
);

export { router as publicRoutes };
