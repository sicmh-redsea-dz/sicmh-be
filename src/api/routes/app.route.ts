import { Router } from 'express';
import { patientRoutes } from './patients.route'
import { scheduleRoutes } from './schedule.route'
import { visitsRoutes } from './visits.route'
import { dashbRoutes } from './dashboard.route'
import { invoiceRoutes } from './invoice.route'

const router = Router()

router.use(
    '/', 
    dashbRoutes
)
router.use(
    '/patients', 
    patientRoutes
)
router.use(
    '/visits', 
    visitsRoutes
)
router.use(
    '/invoice',
    invoiceRoutes
)
router.use(
    '/scheduling', 
    scheduleRoutes
)


export { router as appRoutes }