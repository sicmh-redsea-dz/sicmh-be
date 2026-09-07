import { Router } from 'express'
import { requireResolvedAnyPermission } from '../middlewares/permission.middleware'
import { OrRoomsController } from '../controllers/or-rooms.controller'
import { getClinicalPermissionForOrigin, Permission } from '../permissions/permissions'

const router = Router()
const controller = new OrRoomsController()

const resolveRoomReadPermission = (): Permission[] => {
  const derived = getClinicalPermissionForOrigin('oroom', 'read')
  return derived ? ['visits.read', derived] : ['visits.read']
}

const resolveRoomUpdatePermission = (): Permission[] => {
  const derived = getClinicalPermissionForOrigin('oroom', 'update')
  return derived ? ['visits.update', derived] : ['visits.update']
}

router.get(
  '/',
  requireResolvedAnyPermission(() => resolveRoomReadPermission(), 'visits.read'),
  controller.getRooms.bind(controller)
)

router.post(
  '/',
  requireResolvedAnyPermission(() => resolveRoomUpdatePermission(), 'visits.update'),
  controller.createRoom.bind(controller)
)

router.patch(
  '/:roomId',
  requireResolvedAnyPermission(() => resolveRoomUpdatePermission(), 'visits.update'),
  controller.updateRoom.bind(controller)
)

router.post(
  '/:roomId/assign',
  requireResolvedAnyPermission(() => resolveRoomUpdatePermission(), 'visits.update'),
  controller.assignRoom.bind(controller)
)

router.post(
  '/:roomId/release',
  requireResolvedAnyPermission(() => resolveRoomUpdatePermission(), 'visits.update'),
  controller.releaseRoom.bind(controller)
)

export { router as orRoomsRoutes }
