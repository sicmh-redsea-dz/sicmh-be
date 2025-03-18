import { Router } from "express";
import { patientRoutes } from './patients.route'
import { scheduleRoutes } from './schedule.route'

const router = Router()

router.use('/patients', patientRoutes)
router.use('/scheduling', scheduleRoutes)


export { router as appRoutes }