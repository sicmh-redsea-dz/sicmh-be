"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleRoutes = void 0;
const express_1 = require("express");
const schedule_controller_1 = require("../controllers/schedule.controller");
const router = (0, express_1.Router)();
exports.scheduleRoutes = router;
router.post('/event', schedule_controller_1.ScheduleController.scheduleEvent);
