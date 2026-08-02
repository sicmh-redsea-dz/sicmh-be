import { and, count, desc, eq, isNull, like, or, SQL } from 'drizzle-orm'
import { VisitsRepository } from '../../application/ports/visits.repository'
import { History, ShortHistory } from '../../domain/entities/History'
import { ShortPatient } from '../../domain/entities/Patient'
import { Staff } from '../../domain/entities/Staff'
import { TenantContext } from '../database/TenantContext'
import {
  clinicalEncounters,
  encounterProducts,
  encounterVitals,
  inventoryStock,
  invoices,
  patients,
  products,
  staffMembers,
} from '../database/schema/tenant'

const visitType = (type: typeof clinicalEncounters.$inferSelect['type']) => ({
  outpatient: 'Consulta',
  emergency: 'Emergencia',
  hospitalization: 'Hospitalizacion',
  operating_room: 'Quirofano',
}[type])

const encounterType = (value: unknown): typeof clinicalEncounters.$inferInsert['type'] => {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized.includes('emer')) return 'emergency'
  if (normalized.includes('hosp')) return 'hospitalization'
  if (normalized.includes('quiro')) return 'operating_room'
  return 'outpatient'
}

export class MysqlVisitsRepository implements VisitsRepository {
  async findAll(args: { limit: number; offset: number; term: string; ext: string }): Promise<ShortHistory[]> {
    const filter = this.filter(args.term, args.ext)
    const db = TenantContext.getDb()
    const [rows, totals] = await Promise.all([
      this.listQuery().where(filter).orderBy(desc(clinicalEncounters.occurredAt)).limit(args.limit).offset(args.offset),
      db
        .select({ total: count() })
        .from(clinicalEncounters)
        .innerJoin(patients, eq(clinicalEncounters.patientId, patients.id))
        .innerJoin(staffMembers, eq(clinicalEncounters.staffMemberId, staffMembers.id))
        .where(filter),
    ])
    return rows.map((row) => this.toShortHistory(row, totals[0]?.total ?? 0))
  }

  async findAllUnbounded(args: { term: string; ext?: string }): Promise<ShortHistory[]> {
    const filter = this.filter(args.term, args.ext ?? '')
    const rows = await this.listQuery().where(filter).orderBy(desc(clinicalEncounters.occurredAt)).limit(5000)
    return rows.map((row) => this.toShortHistory(row, rows.length))
  }

  async findById(id: string): Promise<History | null> {
    const db = TenantContext.getDb()
    const [row] = await db
      .select({
        encounter: clinicalEncounters,
        vitals: encounterVitals,
        patient: patients,
        staff: staffMembers,
      })
      .from(clinicalEncounters)
      .innerJoin(patients, eq(clinicalEncounters.patientId, patients.id))
      .innerJoin(staffMembers, eq(clinicalEncounters.staffMemberId, staffMembers.id))
      .leftJoin(encounterVitals, and(
        eq(encounterVitals.clinicalEncounterId, clinicalEncounters.id),
        isNull(encounterVitals.deletedAt),
      ))
      .where(and(eq(clinicalEncounters.id, id), isNull(clinicalEncounters.deletedAt)))
      .limit(1)
    if (!row) return null
    const used = await db
      .select({ InventarioID: encounterProducts.productId, CantidadUsada: encounterProducts.quantity })
      .from(encounterProducts)
      .where(and(eq(encounterProducts.clinicalEncounterId, id), isNull(encounterProducts.deletedAt)))
    return {
      HistoriaID: row.encounter.id,
      PacienteID: row.encounter.patientId,
      FechaVisita: row.encounter.occurredAt,
      Diagnostico: row.encounter.diagnosis,
      Tratamiento: row.encounter.treatment,
      Notas: row.encounter.notes ?? '',
      Presion: row.vitals?.bloodPressure ?? '',
      Oxigenacion: Number(row.vitals?.oxygenSaturation ?? 0),
      Temperatura: row.vitals?.temperature ?? '',
      Glucometria: row.vitals?.bloodGlucose ?? '',
      Peso: row.vitals?.weight ?? '',
      Altura: row.vitals?.height ?? '',
      IMC: row.vitals?.bodyMassIndex ?? null,
      PorcentajeGrasa: row.vitals?.bodyFatPercent ?? null,
      GrasaVisceral: row.vitals?.visceralFat ?? null,
      EdadSegunPeso: row.vitals?.metabolicAge ? String(row.vitals.metabolicAge) : null,
      FechaUltimaVisita: row.encounter.lastVisitAt ?? row.encounter.occurredAt,
      isActive: 1,
      TipoVisita: visitType(row.encounter.type),
      FacturaID: row.encounter.invoiceId ?? '',
      PersonalID: row.encounter.staffMemberId,
      Ant_Familiar: row.encounter.familyHistory,
      Ant_Habito: row.encounter.habitsHistory,
      Ant_Patologico: row.encounter.pathologicalHistory,
      Ant_Quirurgico: row.encounter.surgicalHistory,
      NombrePaciente: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
      NombreDoctor: `${row.staff.firstName} ${row.staff.lastName}`.trim(),
      InventarioUsado: used,
    }
  }

  async create(data: Record<string, unknown>): Promise<string> {
    const db = TenantContext.getDb()
    return db.transaction(async (transaction) => {
      const [created] = await transaction
        .insert(clinicalEncounters)
        .values({
          patientId: String(data.PacienteID),
          staffMemberId: String(data.PersonalID),
          invoiceId: data.FacturaID ? String(data.FacturaID) : null,
          type: encounterType(data.TipoVisita),
          occurredAt: data.FechaVisita ? new Date(String(data.FechaVisita)) : new Date(),
          lastVisitAt: data.FechaUltimaVisita ? new Date(String(data.FechaUltimaVisita)) : new Date(),
          diagnosis: this.optionalString(data.Diagnostico),
          treatment: this.optionalString(data.Tratamiento),
          notes: this.optionalString(data.Notas),
          familyHistory: this.optionalString(data.Ant_Familiar),
          habitsHistory: this.optionalString(data.Ant_Habito),
          pathologicalHistory: this.optionalString(data.Ant_Patologico),
          surgicalHistory: this.optionalString(data.Ant_Quirurgico),
        })
        .$returningId()
      await transaction.insert(encounterVitals).values(this.vitals(created.id, data))
      return created.id
    })
  }

  async update(id: string, data: Record<string, unknown>): Promise<number> {
    const db = TenantContext.getDb()
    return db.transaction(async (transaction) => {
      const result = await transaction
        .update(clinicalEncounters)
        .set({
          patientId: data.PacienteID ? String(data.PacienteID) : undefined,
          staffMemberId: data.PersonalID ? String(data.PersonalID) : undefined,
          type: data.TipoVisita ? encounterType(data.TipoVisita) : undefined,
          lastVisitAt: data.FechaUltimaVisita ? new Date(String(data.FechaUltimaVisita)) : undefined,
          diagnosis: this.optionalString(data.Diagnostico),
          treatment: this.optionalString(data.Tratamiento),
          notes: this.optionalString(data.Notas),
          familyHistory: this.optionalString(data.Ant_Familiar),
          habitsHistory: this.optionalString(data.Ant_Habito),
          pathologicalHistory: this.optionalString(data.Ant_Patologico),
          surgicalHistory: this.optionalString(data.Ant_Quirurgico),
        })
        .where(and(eq(clinicalEncounters.id, id), isNull(clinicalEncounters.deletedAt)))
      await transaction
        .insert(encounterVitals)
        .values(this.vitals(id, data))
        .onDuplicateKeyUpdate({ set: { ...this.vitals(id, data), deletedAt: null } })
      return result[0].affectedRows
    })
  }

  async softDelete(id: string): Promise<number> {
    const result = await TenantContext.getDb()
      .update(clinicalEncounters)
      .set({ deletedAt: new Date() })
      .where(and(eq(clinicalEncounters.id, id), isNull(clinicalEncounters.deletedAt)))
    return result[0].affectedRows
  }

  async findDoctors(term: string): Promise<Staff[]> {
    const filter = term.trim()
      ? and(
          isNull(staffMembers.deletedAt),
          or(like(staffMembers.firstName, `%${term}%`), like(staffMembers.lastName, `%${term}%`)),
        )
      : isNull(staffMembers.deletedAt)
    const rows = await TenantContext.getDb().select().from(staffMembers).where(filter).limit(20)
    return rows.map((row) => ({
      PersonalID: row.id,
      NombrePersonal: `${row.firstName} ${row.lastName}`.trim(),
      Especialidad: row.specialty ?? '',
      UsuarioID: row.userId ?? '',
    }))
  }

  async findPatients(term: string): Promise<ShortPatient[]> {
    const filter = term.trim()
      ? and(
          isNull(patients.deletedAt),
          or(
            like(patients.firstName, `%${term}%`),
            like(patients.lastName, `%${term}%`),
            like(patients.identification, `%${term}%`),
          ),
        )
      : isNull(patients.deletedAt)
    const rows = await TenantContext.getDb().select().from(patients).where(filter).limit(20)
    return rows.map((row) => ({
      PacienteID: row.id,
      NombrePersonal: `${row.firstName} ${row.lastName}`.trim(),
    }))
  }

  async findStockItems(subinventoryId: string): Promise<Array<Record<string, unknown>>> {
    const rows = await TenantContext.getDb()
      .select({ product: products, stock: inventoryStock })
      .from(inventoryStock)
      .innerJoin(products, eq(inventoryStock.productId, products.id))
      .where(and(
        eq(inventoryStock.locationId, subinventoryId),
        isNull(inventoryStock.deletedAt),
        isNull(products.deletedAt),
      ))
    return rows.map(({ product, stock }) => ({
      ProductoID: product.id,
      NombreProducto: product.name,
      Descripcion: product.description ?? '',
      Cantidad: stock.quantity,
      PrecioUnidad: product.unitPrice,
    }))
  }

  private listQuery() {
    return TenantContext.getDb()
      .select({
        encounter: clinicalEncounters,
        patient: patients,
        staff: staffMembers,
        invoice: invoices,
      })
      .from(clinicalEncounters)
      .innerJoin(patients, eq(clinicalEncounters.patientId, patients.id))
      .innerJoin(staffMembers, eq(clinicalEncounters.staffMemberId, staffMembers.id))
      .leftJoin(invoices, eq(clinicalEncounters.invoiceId, invoices.id))
  }

  private filter(term: string, ext: string): SQL {
    const conditions: SQL[] = [
      isNull(clinicalEncounters.deletedAt),
      isNull(patients.deletedAt),
      isNull(staffMembers.deletedAt),
    ]
    if (term.trim()) {
      conditions.push(or(
        like(patients.identification, `%${term}%`),
        like(patients.firstName, `%${term}%`),
        like(patients.lastName, `%${term}%`),
        like(staffMembers.firstName, `%${term}%`),
        like(staffMembers.lastName, `%${term}%`),
      )!)
    }
    const typeByExtension: Record<string, typeof clinicalEncounters.$inferSelect['type']> = {
      visits: 'outpatient',
      emergency: 'emergency',
      hospitalization: 'hospitalization',
      'o-room': 'operating_room',
      oroom: 'operating_room',
    }
    if (typeByExtension[ext]) conditions.push(eq(clinicalEncounters.type, typeByExtension[ext]))
    return and(...conditions)!
  }

  private toShortHistory(
    row: {
      encounter: typeof clinicalEncounters.$inferSelect
      patient: typeof patients.$inferSelect
      staff: typeof staffMembers.$inferSelect
      invoice: typeof invoices.$inferSelect | null
    },
    total: number,
  ): ShortHistory {
    return {
      HistoriaID: row.encounter.id,
      PacienteID: row.patient.id,
      NombreDoctor: `${row.staff.firstName} ${row.staff.lastName}`.trim(),
      NombrePaciente: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
      IdPaciente: row.patient.identification ?? '',
      FechaUltimaVisita: (row.encounter.lastVisitAt ?? row.encounter.occurredAt).toISOString(),
      TipoVisita: visitType(row.encounter.type),
      Diagnostico: row.encounter.diagnosis ?? '',
      InvoiceNumber: row.invoice?.invoiceNumber ?? '',
      Estado: row.invoice?.status ?? 'Pendiente',
      total_registries: total,
    }
  }

  private vitals(encounterId: string, data: Record<string, unknown>) {
    return {
      clinicalEncounterId: encounterId,
      bloodPressure: this.optionalString(data.Presion),
      oxygenSaturation: this.optionalDecimal(data.Oxigenacion),
      temperature: this.optionalDecimal(data.Temperatura),
      bloodGlucose: this.optionalDecimal(data.Glucometria),
      weight: this.optionalDecimal(data.Peso),
      height: this.optionalDecimal(data.Altura),
      bodyMassIndex: this.optionalDecimal(data.IMC),
      bodyFatPercent: this.optionalDecimal(data.PorcentajeGrasa),
      visceralFat: this.optionalDecimal(data.GrasaVisceral),
      metabolicAge: data.EdadSegunPeso == null ? null : Number(data.EdadSegunPeso),
    }
  }

  private optionalString(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null
    return String(value)
  }

  private optionalDecimal(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null
    return String(value)
  }
}
