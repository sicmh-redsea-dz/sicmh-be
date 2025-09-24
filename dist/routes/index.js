"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockRoutes = exports.visitsRoutes = exports.dashboardRoutes = exports.authRoutes = exports.patientsRoutes = void 0;
var patients_routes_1 = require("./patients.routes");
Object.defineProperty(exports, "patientsRoutes", { enumerable: true, get: function () { return __importDefault(patients_routes_1).default; } });
var auth_routes_1 = require("./auth.routes");
Object.defineProperty(exports, "authRoutes", { enumerable: true, get: function () { return __importDefault(auth_routes_1).default; } });
var dashboard_routes_1 = require("./dashboard.routes");
Object.defineProperty(exports, "dashboardRoutes", { enumerable: true, get: function () { return __importDefault(dashboard_routes_1).default; } });
var visits_routes_1 = require("./visits.routes");
Object.defineProperty(exports, "visitsRoutes", { enumerable: true, get: function () { return __importDefault(visits_routes_1).default; } });
var stock_routes_1 = require("./stock.routes");
Object.defineProperty(exports, "stockRoutes", { enumerable: true, get: function () { return __importDefault(stock_routes_1).default; } });
