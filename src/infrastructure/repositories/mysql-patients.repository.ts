import { and, count, eq, isNull, like, or } from 'drizzle-orm'
import { PatientCreateParams, PatientsRepository, PatientUpdateParams } from '../../application/ports/patients.repository'
import { Patient } from '../../domain/entities/Patient'
import { TenantContext } from '../database/TenantContext'
import { patients } from '../database/schema/tenant'

const toPatient = (patient: typeof patients.$inferSelect, totalRegistries = 0): Patient => ({
  PacienteID: patient.id,
  Nombre: patient.firstName,
  Apellido: patient.lastName,
  FechaNacimiento: patient.birthDate ?? new Date(0),
  Telefono: patient.phone ?? '',
  CorreoElectronico: patient.email ?? '',
  Direccion: patient.address ?? '',
  Identificacion: patient.identification ?? '',
  Genero: patient.gender ?? '',
  total_registries: totalRegistries,
})

export class MysqlPatientsRepository implements PatientsRepository {
  async findAll(args: { limit: number; offset: number; term?: string }): Promise<Patient[]> {
    const term = args.term?.trim()
    const filter = term
      ? and(
          isNull(patients.deletedAt),
          or(
            like(patients.firstName, `%${term}%`),
            like(patients.lastName, `%${term}%`),
            like(patients.identification, `%${term}%`),
          ),
        )
      : isNull(patients.deletedAt)
    const db = TenantContext.getDb()
    const [rows, totals] = await Promise.all([
      db.select().from(patients).where(filter).limit(args.limit).offset(args.offset),
      db.select({ total: count() }).from(patients).where(filter),
    ])
    const total = totals[0]?.total ?? 0
    return rows.map((patient) => toPatient(patient, total))
  }

  async findById(id: string): Promise<Patient | null> {
    const [patient] = await TenantContext.getDb()
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
      .limit(1)
    return patient ? toPatient(patient) : null
  }

  async create(params: PatientCreateParams): Promise<string> {
    const [created] = await TenantContext.getDb()
      .insert(patients)
      .values({
        firstName: params.firstName,
        lastName: params.lastName,
        birthDate: params.birthdate ? new Date(params.birthdate) : null,
        phone: params.phone,
        email: params.email,
        address: params.address,
        identification: params.id,
        gender: params.gender,
      })
      .$returningId()
    return created.id
  }

  async update(id: string, params: PatientUpdateParams): Promise<number> {
    const result = await TenantContext.getDb()
      .update(patients)
      .set({
        firstName: params.firstName,
        lastName: params.lastName,
        birthDate: params.birthdate ? new Date(params.birthdate) : undefined,
        phone: params.phone,
        email: params.email,
        address: params.address,
        gender: params.gender,
      })
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
    return result[0].affectedRows
  }

  async softDelete(id: string): Promise<number> {
    const result = await TenantContext.getDb()
      .update(patients)
      .set({ deletedAt: new Date() })
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
    return result[0].affectedRows
  }
}
