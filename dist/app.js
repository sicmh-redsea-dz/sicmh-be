"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const errorHandler_1 = require("./api/middlewares/errorHandler");
const auth_route_1 = require("./api/routes/auth.route");
const app_route_1 = require("./api/routes/app.route");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use('/app', app_route_1.appRoutes);
app.use('/auth', auth_route_1.authRoutes);
app.use((err, req, res, next) => {
    (0, errorHandler_1.errorHandler)(err, res, next);
});
exports.default = app;
