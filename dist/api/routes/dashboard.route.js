"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashbRoutes = void 0;
const express_1 = require("express");
const dashboard_controlller_1 = require("../controllers/dashboard.controlller");
const router = (0, express_1.Router)();
exports.dashbRoutes = router;
const dashb = new dashboard_controlller_1.DashboardController();
router.get('/', dashb.getData.bind(dashb));
