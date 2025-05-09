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

export { router as visitsRoutes }