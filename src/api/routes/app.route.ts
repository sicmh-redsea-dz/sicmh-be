import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { patientRoutes } from './patients.route';
import { scheduleRoutes } from './schedule.route';
import { visitsRoutes } from './visits.route';
import { dashbRoutes } from './dashboard.route';
import { invoiceRoutes } from './invoice.route';
import { invRoutes } from './inv.route';

const router = Router();

router.use(authMiddleware);

router.use('/', dashbRoutes);
router.use('/patients', patientRoutes);
router.use('/visits', visitsRoutes);
router.use('/invoice', invoiceRoutes);
router.use('/scheduling', scheduleRoutes);
router.use('/inventory', invRoutes);

export { router as appRoutes };
