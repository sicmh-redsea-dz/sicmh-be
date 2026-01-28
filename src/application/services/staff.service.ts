import { StaffRepository } from '../ports/staff.repository'
import { StaffMapper } from '../../domain/mappers/StaffMapper'
import { StaffResponse } from '../../domain/responses/StaffResponse'

export class StaffService {
    constructor(private readonly staffRepo: StaffRepository) {}

    async getAllDocs(): Promise<StaffResponse[]> {
        try {
            const staff = await this.staffRepo.findAll()
            return staff.map(( s ) => StaffMapper.toStaffResponse( s ))
        } catch ( err ) {
            throw err
        }
    }
}
