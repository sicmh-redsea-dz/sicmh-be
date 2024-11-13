import { Router  } from 'express';
import { getPatient, getPatients, patchPacient, postPatients, softDeletePacient } from '../controllers/patients.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateJwt, getPatients);
router.get('/:id', authenticateJwt, getPatient);
router.post('/new-patient', authenticateJwt, postPatients);
router.patch('/:id', authenticateJwt, patchPacient);
router.delete('/:id', authenticateJwt, softDeletePacient);

export default router;
