"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDb = exports.pool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const env_1 = require("./env");
exports.pool = promise_1.default.createPool({
    host: env_1.config.DB_HOST || 'localhost',
    user: env_1.config.DB_USER || 'redseadb',
    password: env_1.config.DB_PASSWORD || '',
    database: env_1.config.DB_SCHEMA || 'cami-vime',
    port: parseInt(env_1.config.DB_PORT || '3306', 10)
});
const initializeDb = async () => {
    try {
        await exports.pool.query('select now()');
        console.log('Database connected succesfully');
    }
    catch (err) {
        console.error('Database connection error: ', err);
    }
};
exports.initializeDb = initializeDb;
