import { Router } from "express";
import { PatientsController } from '../controllers/patients.controller';
import { validateGetPatient, validateGetPatients, validatePostPatient, validatePatchPatient, validateDeletePatient } from '../validators/patients.validator';
import { requirePermissions } from '../middlewares/permission.middleware';

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
router.post(
  '/new-patient',
  requirePermissions('patients.create'),
  validatePostPatient,
  patientController.insertPatient.bind(patientController)
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
