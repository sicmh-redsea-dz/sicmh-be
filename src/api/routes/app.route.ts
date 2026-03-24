import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { patientRoutes } from './patients.route';
import { scheduleRoutes } from './schedule.route';
import { visitsRoutes } from './visits.route';
import { dashbRoutes } from './dashboard.route';
import { invoiceRoutes } from './invoice.route';
import { invRoutes } from './inv.route';
import { bedsRoutes } from './beds.route';
import { orRoomsRoutes } from './or-rooms.route';
import { billingRoutes } from './billing.route';
import { settingsRoutes } from './settings.route';

const router = Router();

router.use(authMiddleware);

router.use('/', dashbRoutes);
router.use('/patients', patientRoutes);
router.use('/visits', visitsRoutes);
router.use('/beds', bedsRoutes);
router.use('/or-rooms', orRoomsRoutes);
router.use('/invoice', invoiceRoutes);
router.use('/billing', billingRoutes);
router.use('/settings', settingsRoutes);
router.use('/scheduling', scheduleRoutes);
router.use('/inventory', invRoutes);

export { router as appRoutes };
