import { and, eq, isNull } from 'drizzle-orm'
import { StaffRepository } from '../../application/ports/staff.repository'
import { Staff } from '../../domain/entities/Staff'
import { TenantContext } from '../database/TenantContext'
import { staffMembers } from '../database/schema/tenant'

export class MysqlStaffRepository implements StaffRepository {
  async findAll(): Promise<Staff[]> {
    const rows = await TenantContext.getDb()
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.isActive, true), isNull(staffMembers.deletedAt)))
    return rows.map((staff) => ({
      PersonalID: staff.id,
      NombrePersonal: `${staff.firstName} ${staff.lastName}`.trim(),
      Especialidad: staff.specialty ?? '',
      UsuarioID: staff.userId ?? '',
    }))
  }
}
