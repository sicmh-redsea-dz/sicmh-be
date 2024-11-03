import { Router  } from "express";
import { getPatient, getPatients, patchPacient, postPatients } from '../controllers/patients.controller';
import { authenticateJwt } from "../middleware/auth.middleware";

const router = Router();

router.get('/patients', authenticateJwt, getPatients);
router.get('/patients/:id', authenticateJwt, getPatient);
router.post('/patients/new-patient', authenticateJwt, postPatients);
router.patch('/patients/:id', authenticateJwt, patchPacient);

export default router;
