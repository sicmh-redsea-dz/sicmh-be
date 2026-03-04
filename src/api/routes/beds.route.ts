import { Router } from 'express'
import { requirePermissions } from '../middlewares/permission.middleware'
import { BedsController } from '../controllers/beds.controller'

const router = Router()
const controller = new BedsController()

router.get(
  '/:module',
  requirePermissions('visits.read'),
  controller.getBeds.bind(controller)
)

router.post(
  '/:module',
  requirePermissions('visits.update'),
  controller.createBed.bind(controller)
)

router.patch(
  '/:module/:bedId',
  requirePermissions('visits.update'),
  controller.updateBed.bind(controller)
)

router.post(
  '/:module/:bedId/assign',
  requirePermissions('visits.update'),
  controller.assignBed.bind(controller)
)

router.post(
  '/:module/:bedId/release',
  requirePermissions('visits.update'),
  controller.releaseBed.bind(controller)
)

export { router as bedsRoutes }
