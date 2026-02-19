import { Router } from 'express';
import { validateCreatePatient, validateEditPatient, validateDeletePatient } from '../validators/visits.validator'
import { VisitsController } from '../controllers/visits.controller';
import { requirePermissions } from '../middlewares/permission.middleware'

const router = Router()

const visitsController = new VisitsController()

router.get(
    '/', 
    requirePermissions('visits.read'),
    visitsController.getVisits.bind( visitsController )
)
router.get(
    '/:id', 
    requirePermissions('visits.read'),
    visitsController.getVisit.bind( visitsController )
)
router.post(
    '/create',
    requirePermissions('visits.create'),
    validateCreatePatient,
    visitsController.createVisit.bind( visitsController )
)
router.patch(
    '/edit/:id',
    requirePermissions('visits.update'),
    validateEditPatient, 
    visitsController.editVisit.bind( visitsController )
)
router.delete(
    '/:id', 
    requirePermissions('visits.delete'),
    validateDeletePatient,
    visitsController.deleteVisit.bind( visitsController )
)
router.get(
    '/search/doctors',
    requirePermissions('visits.read'),
    visitsController.getDoctors.bind( visitsController )
)

router.get(
    '/search/patients',
    requirePermissions('visits.read'),
    visitsController.getPatients.bind( visitsController )
)

router.get(
    '/search/stock-items',
    requirePermissions('visits.read'),
    visitsController.getStockItems.bind( visitsController )
)

export { router as visitsRoutes }
