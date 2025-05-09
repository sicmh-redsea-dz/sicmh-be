import { Router } from "express";
import { PatientsController } from '../controllers/patients.controller'
import { authMiddleware } from '../middlewares/auth.middleware'
import { validateGetPatient, validateGetPatients, validatePostPatient, validatePatchPatient, validateDeletePatient } from '../validators/patients.validator'

const router = Router()

const patientController = new PatientsController()

router.get(
    '/', 
    authMiddleware, 
    validateGetPatients, 
    patientController.getPatients.bind( patientController )
)
router.get(
    '/:id', 
    authMiddleware, 
    validateGetPatient, 
    patientController.getPatient.bind( patientController )
)
router.post(
    '/new-patient', 
    authMiddleware, 
    validatePostPatient, 
    patientController.insertPatient.bind( patientController )
)
router.patch(
    '/:id', 
    authMiddleware, 
    validatePatchPatient, 
    patientController.updatePatient.bind( patientController )
)
router.delete(
    '/:id', 
    authMiddleware, 
    validateDeletePatient, 
    patientController.deletePatient.bind( patientController )
)

export { router as patientRoutes }
