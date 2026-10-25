import { and, count, desc, eq, isNull, like, or } from 'drizzle-orm'
import { PatientCreateParams, PatientsRepository, PatientUpdateParams } from '../../application/ports/patients.repository'
import { Patient } from '../../domain/entities/Patient'
import { TenantContext } from '../database/TenantContext'
import { emergencyContacts, patients } from '../database/schema/tenant'

const toPatient = (patient: typeof patients.$inferSelect, totalRegistries = 0): Patient => ({
  PacienteID: patient.id,
  Nombre: patient.firstName,
  Apellido: patient.lastName,
  FechaNacimiento: patient.birthDate ? new Date(patient.birthDate) : null,
  Telefono: patient.phone ?? '',
  CorreoElectronico: patient.email ?? '',
  Direccion: patient.address ?? '',
  Identificacion: patient.identification ?? '',
  Genero: patient.gender ?? '',
  total_registries: totalRegistries,
  identificationType: patient.identificationType,
  notes: patient.notes ?? '',
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
    if (!patient) return null
    const [contact] = await TenantContext.getDb().select().from(emergencyContacts)
      .where(and(eq(emergencyContacts.patientId, id), eq(emergencyContacts.isActive, true), isNull(emergencyContacts.deletedAt)))
      .orderBy(desc(emergencyContacts.isPrimary), emergencyContacts.id).limit(1)
    return { ...toPatient(patient), emergencyContact: contact ? {
      id: contact.id, name: contact.name, relationship: contact.relationship, phone: contact.phone,
      email: contact.email ?? '', address: contact.address ?? '',
    } : null }
  }

  async create(params: PatientCreateParams): Promise<string> {
    return TenantContext.transaction(async () => {
      const [created] = await TenantContext.getDb()
        .insert(patients)
        .values({
          firstName: params.firstName,
          lastName: params.lastName,
          birthDate: params.birthdate ? params.birthdate.slice(0, 10) : null,
          phone: params.phone,
          email: params.email,
          address: params.address,
          identification: params.id,
          identificationType: params.identificationType,
          notes: params.notes,
          gender: params.gender,
        })
        .$returningId()
      await this.saveContact(created.id, params.emergencyContact)
      return created.id
    })
  }

  async update(id: string, params: PatientUpdateParams): Promise<number> {
    const persist = async () => {
      const result = await TenantContext.getDb()
        .update(patients)
        .set({
          firstName: params.firstName,
          lastName: params.lastName,
          birthDate: params.birthdate ? params.birthdate.slice(0, 10) : undefined,
          phone: params.phone,
          email: params.email,
          address: params.address,
          identification: params.id,
          identificationType: params.identificationType,
          notes: params.notes,
          gender: params.gender,
          updatedAt: new Date(),
        })
        .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
      if (result[0].affectedRows) await this.saveContact(id, params.emergencyContact)
      return result[0].affectedRows
    }
    return params.emergencyContact === undefined ? persist() : TenantContext.transaction(persist)
  }

  private async saveContact(patientId: string, contact: PatientCreateParams['emergencyContact']): Promise<void> {
    if (contact === undefined) return // PATCH omission must preserve existing contacts.
    const db = TenantContext.getDb()
    // Serialize writes per patient; do not replace other (non-primary) contacts.
    await db.select({ id: patients.id }).from(patients).where(eq(patients.id, patientId)).for('update')
    const [existing] = await db.select({ id: emergencyContacts.id }).from(emergencyContacts)
      .where(and(eq(emergencyContacts.patientId, patientId), eq(emergencyContacts.isActive, true), isNull(emergencyContacts.deletedAt)))
      .orderBy(desc(emergencyContacts.isPrimary), emergencyContacts.id).limit(1)
    const empty = !contact || !Object.values(contact).some(value => String(value ?? '').trim())
    if (empty) {
      if (existing) await db.update(emergencyContacts).set({ deletedAt: new Date(), isActive: false })
        .where(eq(emergencyContacts.id, existing.id))
      return
    }
    const values = { patientId, name: contact!.name?.trim() ?? '', relationship: contact!.relationship?.trim() ?? '',
      phone: contact!.phone?.trim() ?? '', email: contact!.email?.trim() || null, address: contact!.address?.trim() || null,
      isPrimary: true, isActive: true, updatedAt: new Date() }
    if (existing) await db.update(emergencyContacts).set(values).where(eq(emergencyContacts.id, existing.id))
    else await db.insert(emergencyContacts).values(values)
  }

  async softDelete(id: string): Promise<number> {
    const result = await TenantContext.getDb()
      .update(patients)
      .set({ deletedAt: new Date() })
      .where(and(eq(patients.id, id), isNull(patients.deletedAt)))
    return result[0].affectedRows
  }
}
