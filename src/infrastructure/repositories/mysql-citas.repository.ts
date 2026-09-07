import { and, asc, eq, gte, gt, isNull, lt, ne } from 'drizzle-orm'
import { CitasRepository, CreateCitaParams, UpdateCitaParams } from '../../application/ports/citas.repository'
import { Cita, CitaEstado, CitaTipo } from '../../domain/entities/Cita'
import { TenantContext } from '../database/TenantContext'
import {
  appointmentSources,
  appointments,
  appointmentStatuses,
  appointmentTypes,
  patients,
  staffMembers,
} from '../database/schema/tenant'

type AppointmentRow = {
  appointment: typeof appointments.$inferSelect
  type: typeof appointmentTypes.$inferSelect
  status: typeof appointmentStatuses.$inferSelect
  source: typeof appointmentSources.$inferSelect
  staff: typeof staffMembers.$inferSelect | null
  patient: typeof patients.$inferSelect | null
}

const LEGACY_SOURCE_MAP: Record<string, string> = {
  en_persona: 'manual',
  llamada: 'manual',
}

export class MysqlCitasRepository implements CitasRepository {
  async list(start: string, end: string): Promise<Cita[]> {
    const rows = await this.baseQuery()
      .where(and(
        this.activeFilters(),
        gte(appointments.startsAt, this.toDate(start)),
        lt(appointments.startsAt, this.toDate(end)),
      ))
      .orderBy(asc(appointments.startsAt))
    return rows.map((row) => this.toCita(row))
  }

  async listUpcoming(): Promise<Cita[]> {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const rows = await this.baseQuery()
      .where(and(this.activeFilters(), gte(appointments.startsAt, start)))
      .orderBy(asc(appointments.startsAt))
      .limit(10)
    return rows.map((row) => this.toCita(row))
  }

  async findById(id: string): Promise<Cita | null> {
    const [row] = await this.baseQuery()
      .where(and(this.activeFilters(), eq(appointments.id, id)))
      .limit(1)
    return row ? this.toCita(row) : null
  }

  async create(params: CreateCitaParams): Promise<string> {
    const [typeId, statusId, sourceId] = await Promise.all([
      this.findTypeId(params.tipo),
      this.findStatusId(params.estado),
      this.findSourceId(params.source),
    ])

    const [created] = await TenantContext.getDb()
      .insert(appointments)
      .values({
        typeId,
        statusId,
        sourceId,
        staffMemberId: params.personalId ?? null,
        patientId: params.pacienteId ?? null,
        bedId: params.recursoTipo === 'cama' ? params.recursoId ?? null : null,
        operatingRoomId: params.recursoTipo === 'quirofano' ? params.recursoId ?? null : null,
        createdBy: params.creadoPor ?? null,
        title: params.titulo.trim(),
        description: params.descripcion?.trim() || null,
        startsAt: this.toDate(params.inicio),
        endsAt: this.toDate(params.fin),
        patientName: params.nombrePaciente?.trim() || null,
        chatbotSessionId: params.chatbotSesionId ?? null,
        notes: params.notas?.trim() || null,
      })
      .$returningId()
    return created.id
  }

  async update(params: UpdateCitaParams): Promise<void> {
    const [typeId, statusId, sourceId] = await Promise.all([
      this.findTypeId(params.tipo),
      this.findStatusId(params.estado),
      this.findSourceId(params.source),
    ])

    await TenantContext.getDb()
      .update(appointments)
      .set({
        typeId,
        statusId,
        sourceId,
        staffMemberId: params.personalId ?? null,
        patientId: params.pacienteId ?? null,
        bedId: params.recursoTipo === 'cama' ? params.recursoId ?? null : null,
        operatingRoomId: params.recursoTipo === 'quirofano' ? params.recursoId ?? null : null,
        title: params.titulo.trim(),
        description: params.descripcion?.trim() || null,
        startsAt: this.toDate(params.inicio),
        endsAt: this.toDate(params.fin),
        patientName: params.nombrePaciente?.trim() || null,
        notes: params.notas?.trim() || null,
      })
      .where(and(eq(appointments.id, params.citaId), isNull(appointments.deletedAt)))
  }

  async findPacienteByIdentificacion(identificacion: string): Promise<string | null> {
    const [row] = await TenantContext.getDb()
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.identification, identificacion), isNull(patients.deletedAt)))
      .limit(1)
    return row?.id ?? null
  }

  async delete(id: string): Promise<void> {
    await TenantContext.getDb()
      .update(appointments)
      .set({ deletedAt: new Date() })
      .where(and(eq(appointments.id, id), isNull(appointments.deletedAt)))
  }

  async listDoctors(): Promise<{ id: string; nombre: string; especialidad: string }[]> {
    const rows = await TenantContext.getDb()
      .select({
        id: staffMembers.id,
        firstName: staffMembers.firstName,
        lastName: staffMembers.lastName,
        specialty: staffMembers.specialty,
      })
      .from(staffMembers)
      .where(and(eq(staffMembers.isActive, true), isNull(staffMembers.deletedAt)))
      .orderBy(asc(staffMembers.firstName), asc(staffMembers.lastName))
    return rows.map((row) => ({
      id: row.id,
      nombre: `${row.firstName} ${row.lastName}`.trim(),
      especialidad: row.specialty ?? '',
    }))
  }

  async listSources(): Promise<string[]> {
    const rows = await TenantContext.getDb()
      .select({ code: appointmentSources.code })
      .from(appointmentSources)
      .where(isNull(appointmentSources.deletedAt))
      .orderBy(asc(appointmentSources.name))
    return rows.map((row) => row.code)
  }

  async checkDoctorConflict(personalId: string, inicio: string, fin: string, excludeCitaId?: string): Promise<boolean> {
    const filters = [
      eq(appointments.staffMemberId, personalId),
      lt(appointments.startsAt, this.toDate(fin)),
      gt(appointments.endsAt, this.toDate(inicio)),
      isNull(appointments.deletedAt),
    ]
    if (excludeCitaId) {
      filters.push(ne(appointments.id, excludeCitaId))
    }
    const [row] = await TenantContext.getDb()
      .select({ id: appointments.id })
      .from(appointments)
      .where(and(...filters))
      .limit(1)
    return Boolean(row)
  }

  private baseQuery() {
    return TenantContext.getDb()
      .select({
        appointment: appointments,
        type: appointmentTypes,
        status: appointmentStatuses,
        source: appointmentSources,
        staff: staffMembers,
        patient: patients,
      })
      .from(appointments)
      .innerJoin(appointmentTypes, eq(appointments.typeId, appointmentTypes.id))
      .innerJoin(appointmentStatuses, eq(appointments.statusId, appointmentStatuses.id))
      .innerJoin(appointmentSources, eq(appointments.sourceId, appointmentSources.id))
      .leftJoin(staffMembers, eq(appointments.staffMemberId, staffMembers.id))
      .leftJoin(patients, eq(appointments.patientId, patients.id))
  }

  private activeFilters() {
    return and(
      isNull(appointments.deletedAt),
      isNull(appointmentTypes.deletedAt),
      isNull(appointmentStatuses.deletedAt),
      isNull(appointmentSources.deletedAt),
    )!
  }

  private toCita(row: AppointmentRow): Cita {
    const patientName = row.patient
      ? `${row.patient.firstName} ${row.patient.lastName}`.trim()
      : row.appointment.patientName ?? null
    const doctorName = row.staff
      ? `${row.staff.firstName} ${row.staff.lastName}`.trim()
      : null

    return {
      CitaID: row.appointment.id,
      Titulo: row.appointment.title,
      Descripcion: row.appointment.description ?? null,
      Inicio: row.appointment.startsAt.toISOString(),
      Fin: row.appointment.endsAt.toISOString(),
      Tipo: this.toTipo(row.type.code),
      Estado: this.toEstado(row.status.code),
      RecursoTipo: row.appointment.bedId ? 'cama' : row.appointment.operatingRoomId ? 'quirofano' : null,
      RecursoID: row.appointment.bedId ?? row.appointment.operatingRoomId ?? null,
      Source: row.source.code,
      ExternalId: row.appointment.externalId ?? null,
      ChatbotSesionID: row.appointment.chatbotSessionId ?? null,
      Notas: row.appointment.notes ?? null,
      PersonalID: row.appointment.staffMemberId ?? null,
      NombreDoctor: doctorName,
      PacienteID: row.appointment.patientId ?? null,
      PacienteIdentificacion: row.patient?.identification ?? null,
      NombrePaciente: patientName,
      CreadoPor: row.appointment.createdBy ?? null,
      CreadoEn: row.appointment.createdAt.toISOString(),
      ActualizadoEn: row.appointment.updatedAt.toISOString(),
    }
  }

  private async findTypeId(code: string): Promise<string> {
    const [row] = await TenantContext.getDb()
      .select({ id: appointmentTypes.id })
      .from(appointmentTypes)
      .where(and(eq(appointmentTypes.code, code), isNull(appointmentTypes.deletedAt)))
      .limit(1)
    if (!row) throw this.validationError(`Tipo de cita no configurado: ${code}`)
    return row.id
  }

  private async findStatusId(code: string): Promise<string> {
    const [row] = await TenantContext.getDb()
      .select({ id: appointmentStatuses.id })
      .from(appointmentStatuses)
      .where(and(eq(appointmentStatuses.code, code), isNull(appointmentStatuses.deletedAt)))
      .limit(1)
    if (!row) throw this.validationError(`Estado de cita no configurado: ${code}`)
    return row.id
  }

  private async findSourceId(code?: string): Promise<string> {
    const normalized = this.normalizeSourceCode(code)
    const [row] = await TenantContext.getDb()
      .select({ id: appointmentSources.id })
      .from(appointmentSources)
      .where(and(eq(appointmentSources.code, normalized), isNull(appointmentSources.deletedAt)))
      .limit(1)
    if (!row) throw this.validationError(`Fuente de cita no configurada: ${normalized}`)
    return row.id
  }

  private normalizeSourceCode(source?: string): string {
    const normalized = String(source ?? 'manual').trim().toLowerCase()
    return LEGACY_SOURCE_MAP[normalized] ?? normalized
  }

  private toTipo(code: string): CitaTipo {
    const normalized = code.trim().toLowerCase()
    return ['consulta', 'cirugia', 'hospitalizacion', 'seguimiento', 'otro'].includes(normalized)
      ? normalized as CitaTipo
      : 'otro'
  }

  private toEstado(code: string): CitaEstado {
    const normalized = code.trim().toLowerCase()
    return ['pendiente', 'confirmada', 'cancelada', 'completada'].includes(normalized)
      ? normalized as CitaEstado
      : 'pendiente'
  }

  private toDate(value: string): Date {
    return new Date(value)
  }

  private validationError(message: string) {
    const error: any = new Error(message)
    error.name = 'validation_errors'
    error.errors = [{ msg: message }]
    return error
  }
}
