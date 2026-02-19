import { Router } from "express";
import { ScheduleController } from "../controllers/schedule.controller";
import { requirePermissions } from '../middlewares/permission.middleware';

const router = Router()

router.post('/event', requirePermissions('schedule.create'), ScheduleController.scheduleEvent)

export { router as scheduleRoutes }
