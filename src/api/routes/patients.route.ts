import { Router } from "express";
import { PatientsController } from '../controllers/patients.controller';
import { validateGetPatient, validateGetPatients, validatePostPatient, validatePatchPatient, validateDeletePatient } from '../validators/patients.validator';

const router = Router();

const patientController = new PatientsController();

router.get(
  '/',
  validateGetPatients,
  patientController.getPatients.bind(patientController)
);
router.get(
  '/:id',
  validateGetPatient,
  patientController.getPatient.bind(patientController)
);
router.post(
  '/new-patient',
  validatePostPatient,
  patientController.insertPatient.bind(patientController)
);
router.patch(
  '/:id',
  validatePatchPatient,
  patientController.updatePatient.bind(patientController)
);
router.delete(
  '/:id',
  validateDeletePatient,
  patientController.deletePatient.bind(patientController)
);

export { router as patientRoutes };
