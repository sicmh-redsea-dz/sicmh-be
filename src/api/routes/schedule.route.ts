import { Router } from "express";
import { ScheduleController } from "../controllers/schedule.controller";

const router = Router()

router.post('/event', ScheduleController.scheduleEvent)

export { router as scheduleRoutes }