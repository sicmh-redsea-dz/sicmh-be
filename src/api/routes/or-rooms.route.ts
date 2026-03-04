import { Router } from 'express'
import { requirePermissions } from '../middlewares/permission.middleware'
import { OrRoomsController } from '../controllers/or-rooms.controller'

const router = Router()
const controller = new OrRoomsController()

router.get(
  '/',
  requirePermissions('visits.read'),
  controller.getRooms.bind(controller)
)

router.post(
  '/',
  requirePermissions('visits.update'),
  controller.createRoom.bind(controller)
)

router.patch(
  '/:roomId',
  requirePermissions('visits.update'),
  controller.updateRoom.bind(controller)
)

router.post(
  '/:roomId/assign',
  requirePermissions('visits.update'),
  controller.assignRoom.bind(controller)
)

router.post(
  '/:roomId/release',
  requirePermissions('visits.update'),
  controller.releaseRoom.bind(controller)
)

export { router as orRoomsRoutes }
