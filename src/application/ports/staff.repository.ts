import { Staff } from '../../domain/entities/Staff'

export interface StaffRepository {
    findAll(): Promise<Staff[]>
}
