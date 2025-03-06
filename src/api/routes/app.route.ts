import { Router } from "express";
import { patientRoutes } from './patients.route'

const router = Router()

router.use('/patients', patientRoutes)


export { router as appRoutes }