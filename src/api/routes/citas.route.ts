import { Router } from 'express'
import { requirePermissions } from '../middlewares/permission.middleware'
import { CitasController } from '../controllers/citas.controller'

const router = Router()
const ctrl = new CitasController()

router.get('/doctors',   requirePermissions('schedule.read'),   ctrl.listDoctors.bind(ctrl))
router.get('/sources',   requirePermissions('schedule.read'),   ctrl.listSources.bind(ctrl))
router.get('/events',       requirePermissions('schedule.read'), ctrl.list.bind(ctrl))
router.get('/events/upcoming', requirePermissions('schedule.read'), ctrl.listUpcoming.bind(ctrl))
router.get('/events/:id',   requirePermissions('schedule.read'), ctrl.findById.bind(ctrl))
router.post('/events',   requirePermissions('schedule.create'), ctrl.create.bind(ctrl))
router.patch('/events/:id', requirePermissions('schedule.update'), ctrl.update.bind(ctrl))
router.delete('/events/:id',requirePermissions('schedule.delete'), ctrl.delete.bind(ctrl))

export { router as citasRoutes }
