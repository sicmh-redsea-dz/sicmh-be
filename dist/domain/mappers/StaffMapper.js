"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffMapper = void 0;
class StaffMapper {
    static toStaffResponse(staff) {
        const { PersonalID: id, NombrePersonal: name, Especialidad: specialty, } = staff;
        return {
            id,
            name,
            specialty,
        };
    }
}
exports.StaffMapper = StaffMapper;
