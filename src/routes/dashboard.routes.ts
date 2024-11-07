import { Router } from 'express';
import { patientsRoutes } from './index';
import visitsRoutes from './visits.routes'

const router = Router();

router.use('/patients', patientsRoutes);
router.use ('/visits', visitsRoutes)

export default router;