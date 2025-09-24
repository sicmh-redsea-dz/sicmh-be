"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const env_1 = require("./env");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, env_1.config.SECRET_JWT_TOKEN);
};
exports.verifyToken = verifyToken;
