import { Router } from 'express';
import { patientsRoutes } from './index';
import visitsRoutes from './visits.routes'
import invoiceRoutes from './invoice.routes'
import stockRoutes from './stock.routes'

const router = Router();

router.use('/patients', patientsRoutes);
router.use ('/visits', visitsRoutes)
router.use('/invoices', invoiceRoutes)
router.use('/stock', stockRoutes)

export default router;