"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const port = env_1.config.PORT;
const startServer = async () => {
    await (0, db_1.initializeDb)();
    app_1.default.listen(port, () => {
        console.log(`Server running on port: ${port}`);
    });
};
startServer();
