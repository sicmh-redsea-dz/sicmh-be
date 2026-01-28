import { StaffRepository } from '../../application/ports/staff.repository'
import { Staff } from '../../domain/entities/Staff'
import { Database } from '../database/Database'
import { staffQueries } from '../database/queries/staff.queries'

export class MysqlStaffRepository implements StaffRepository {
    async findAll(): Promise<Staff[]> {
        const query = staffQueries('all-docs')
        return Database.execute<Staff[]>(query)
    }
}
