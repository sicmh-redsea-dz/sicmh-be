import { Staff } from "../entities/Staff";
import { StaffResponse } from "../responses/StaffResponse";

export class StaffMapper {
    static toStaffResponse(staff: Staff): StaffResponse {
        const {
            PersonalID: id,
            NombrePersonal: name,
            Especialidad: specialty,
            UsuarioID: userId
        } = staff

        return {
            id,
            name,
            specialty,
        }
    }
}
