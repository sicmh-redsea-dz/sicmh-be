import { Database } from "../../infrastructure/database/Database"
import { staffQueries } from "../../infrastructure/database/queries/staff.queries"
import { Staff } from "../entities/Staff"
import { StaffMapper } from "../mappers/StaffMapper"
import { StaffResponse } from "../responses/StaffResponse"

export class StaffService {
    async getAllDocs(): Promise<StaffResponse[]> {
        const staffQ = staffQueries('all-docs') 
        try {
            const staff = await Database.execute<Staff[]>( staffQ )
            return staff.map(( s:Staff ) => StaffMapper.toStaffResponse( s ))
        } catch ( err ) {
            throw err
        }
    }
}