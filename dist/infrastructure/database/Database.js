"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const db_1 = require("../../config/db");
class Database {
    static async execute(query, values) {
        try {
            const [result] = await db_1.pool.execute(query, values);
            return result;
        }
        catch (err) {
            throw err;
        }
    }
}
exports.Database = Database;
