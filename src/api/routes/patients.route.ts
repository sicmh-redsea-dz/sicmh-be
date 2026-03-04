import { Router } from "express";
import { PatientsController } from '../controllers/patients.controller';
import { validateGetPatient, validateGetPatients, validatePostPatient, validatePatchPatient, validateDeletePatient, validatePatientImage, validateImageCaptureToken } from '../validators/patients.validator';
import { requireAnyPermission, requirePermissions } from '../middlewares/permission.middleware';

const router = Router();

const patientController = new PatientsController();

router.get(
  '/',
  requirePermissions('patients.read'),
  validateGetPatients,
  patientController.getPatients.bind(patientController)
);
router.get(
  '/:id',
  requirePermissions('patients.read'),
  validateGetPatient,
  patientController.getPatient.bind(patientController)
);
router.get(
  '/:id/image',
  requirePermissions('patients.read'),
  validateGetPatient,
  patientController.getPatientImage.bind(patientController)
);
router.post(
  '/image-capture',
  requireAnyPermission(['patients.create', 'patients.update']),
  patientController.createImageCaptureSession.bind(patientController)
);
router.get(
  '/image-capture/:token',
  requireAnyPermission(['patients.create', 'patients.update']),
  validateImageCaptureToken,
  patientController.getImageCaptureStatus.bind(patientController)
);
router.delete(
  '/image-capture/:token',
  requireAnyPermission(['patients.create', 'patients.update']),
  validateImageCaptureToken,
  patientController.deleteImageCaptureSession.bind(patientController)
);
router.post(
  '/new-patient',
  requirePermissions('patients.create'),
  validatePostPatient,
  patientController.insertPatient.bind(patientController)
);
router.post(
  '/:id/image',
  requirePermissions('patients.update'),
  validatePatientImage,
  patientController.uploadPatientImage.bind(patientController)
);
router.delete(
  '/:id/image',
  requirePermissions('patients.update'),
  validateGetPatient,
  patientController.deletePatientImage.bind(patientController)
);
router.patch(
  '/:id',
  requirePermissions('patients.update'),
  validatePatchPatient,
  patientController.updatePatient.bind(patientController)
);
router.delete(
  '/:id',
  requirePermissions('patients.delete'),
  validateDeletePatient,
  patientController.deletePatient.bind(patientController)
);

export { router as patientRoutes };
