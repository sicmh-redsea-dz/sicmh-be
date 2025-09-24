"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffService = void 0;
const Database_1 = require("../../infrastructure/database/Database");
const staff_queries_1 = require("../../infrastructure/database/queries/staff.queries");
const StaffMapper_1 = require("../mappers/StaffMapper");
class StaffService {
    async getAllDocs() {
        const staffQ = (0, staff_queries_1.staffQueries)('all-docs');
        try {
            const staff = await Database_1.Database.execute(staffQ);
            return staff.map((s) => StaffMapper_1.StaffMapper.toStaffResponse(s));
        }
        catch (err) {
            throw err;
        }
    }
}
exports.StaffService = StaffService;
