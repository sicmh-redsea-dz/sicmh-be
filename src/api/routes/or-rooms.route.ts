import { Router } from 'express'
import { requireVisitOriginPermission } from '../middlewares/permission.middleware'
import { OrRoomsController } from '../controllers/or-rooms.controller'

const router = Router()
const controller = new OrRoomsController()

router.get(
  '/',
  requireVisitOriginPermission('read', 'operating-room'),
  controller.getRooms.bind(controller)
)

router.post(
  '/',
  requireVisitOriginPermission('update', 'operating-room'),
  controller.createRoom.bind(controller)
)

router.patch(
  '/:roomId',
  requireVisitOriginPermission('update', 'operating-room'),
  controller.updateRoom.bind(controller)
)

router.post(
  '/:roomId/assign',
  requireVisitOriginPermission('update', 'operating-room'),
  controller.assignRoom.bind(controller)
)

router.post(
  '/:roomId/release',
  requireVisitOriginPermission('update', 'operating-room'),
  controller.releaseRoom.bind(controller)
)

export { router as orRoomsRoutes }
