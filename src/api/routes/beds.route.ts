import { Router } from 'express'
import { requireVisitOriginPermission } from '../middlewares/permission.middleware'
import { BedsController } from '../controllers/beds.controller'

const router = Router()
const controller = new BedsController()

router.get(
  '/:module',
  requireVisitOriginPermission('read', 'module'),
  controller.getBeds.bind(controller)
)

router.post(
  '/:module',
  requireVisitOriginPermission('update', 'module'),
  controller.createBed.bind(controller)
)

router.patch(
  '/:module/:bedId',
  requireVisitOriginPermission('update', 'module'),
  controller.updateBed.bind(controller)
)

router.post(
  '/:module/:bedId/assign',
  requireVisitOriginPermission('update', 'module'),
  controller.assignBed.bind(controller)
)

router.post(
  '/:module/:bedId/release',
  requireVisitOriginPermission('update', 'module'),
  controller.releaseBed.bind(controller)
)

export { router as bedsRoutes }
