import { Router } from 'express'
import { requireResolvedAnyPermission } from '../middlewares/permission.middleware'
import { BedsController } from '../controllers/beds.controller'
import { getClinicalPermissionForOrigin, Permission } from '../permissions/permissions'

const router = Router()
const controller = new BedsController()

const resolveBedReadPermission = (module?: string): Permission[] => {
  const derived = getClinicalPermissionForOrigin(module, 'read')
  return derived ? ['visits.read', derived] : ['visits.read']
}

const resolveBedUpdatePermission = (module?: string): Permission[] => {
  const derived = getClinicalPermissionForOrigin(module, 'update')
  return derived ? ['visits.update', derived] : ['visits.update']
}

router.get(
  '/:module',
  requireResolvedAnyPermission((req) => resolveBedReadPermission(req.params.module), 'visits.read'),
  controller.getBeds.bind(controller)
)

router.post(
  '/:module',
  requireResolvedAnyPermission((req) => resolveBedUpdatePermission(req.params.module), 'visits.update'),
  controller.createBed.bind(controller)
)

router.patch(
  '/:module/:bedId',
  requireResolvedAnyPermission((req) => resolveBedUpdatePermission(req.params.module), 'visits.update'),
  controller.updateBed.bind(controller)
)

router.post(
  '/:module/:bedId/assign',
  requireResolvedAnyPermission((req) => resolveBedUpdatePermission(req.params.module), 'visits.update'),
  controller.assignBed.bind(controller)
)

router.post(
  '/:module/:bedId/release',
  requireResolvedAnyPermission((req) => resolveBedUpdatePermission(req.params.module), 'visits.update'),
  controller.releaseBed.bind(controller)
)

export { router as bedsRoutes }
