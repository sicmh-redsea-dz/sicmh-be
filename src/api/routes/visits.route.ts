import { Router } from 'express';
import { validateCreatePatient, validateEditPatient, validateDeletePatient } from '../validators/visits.validator'
import { VisitsController } from '../controllers/visits.controller';

const router = Router()

const visitsController = new VisitsController()

router.get(
    '/', 
    visitsController.getVisits.bind( visitsController )
)
router.get(
    '/:id', 
    visitsController.getVisit.bind( visitsController )
)
router.post(
    '/create',
    validateCreatePatient,
    visitsController.createVisit.bind( visitsController )
)
router.patch(
    '/edit/:id',
    validateEditPatient, 
    visitsController.editVisit.bind( visitsController )
)
router.delete(
    '/:id', 
    validateDeletePatient,
    visitsController.deleteVisit.bind( visitsController )
)
router.get(
    '/search/doctors',
    visitsController.getDoctors.bind( visitsController )
)

router.get(
    '/search/patients',
    visitsController.getPatients.bind( visitsController )
)

router.get(
    '/search/stock-items',
    visitsController.getStockItems.bind( visitsController )
)

export { router as visitsRoutes }