import { Router } from "express";
import { PatientsController } from '../controllers/patients.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { validateGetPatient, validateGetPatients, validatePostPatient, validatePatchPatient } from '../validators/patients.validator'

const router = Router()

router.get('/', validateGetPatients, authMiddleware, PatientsController.getPatients)
router.get('/:id', validateGetPatient, authMiddleware, PatientsController.getPatient)
router.post('/new-patient', validatePostPatient, authMiddleware, PatientsController.insertPatient)
router.patch('/:id', validatePatchPatient, authMiddleware, PatientsController.updatePatient);
router.delete('/:id', PatientsController.deletePatient);

export { router as patientRoutes }
