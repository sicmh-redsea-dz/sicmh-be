import {
  and,
  count,
  desc,
  eq,
  gte,
  isNull,
  like,
  lt,
  or,
  sql,
  sum,
} from 'drizzle-orm'
import { InvoiceRepository } from '../../application/ports/invoice.repository'
import { TenantContext } from '../database/TenantContext'
import {
  clinicalEncounters,
  invoices,
  patients,
  paymentMethods,
  services,
  staffMembers,
} from '../database/schema/tenant'

type InvoiceStatus = typeof invoices.$inferInsert['status']

const legacyVisitType = (type: typeof clinicalEncounters.$inferSelect['type'] | null) => ({
  outpatient: 'Consulta',
  emergency: 'Emergencia',
  hospitalization: 'Hospitalizacion',
  operating_room: 'Quirofano',
}[type ?? 'outpatient'])

const legacyInvoice = (row: {
  invoice: typeof invoices.$inferSelect
  patient: typeof patients.$inferSelect | null
  staff: typeof staffMembers.$inferSelect | null
  encounterType: typeof clinicalEncounters.$inferSelect['type'] | null
}) => ({
  FacturaID: row.invoice.id,
  PacienteID: row.invoice.patientId,
  PersonalID: row.invoice.staffMemberId,
  FechaFactura: row.invoice.issuedAt.toISOString(),
  Monto: Number(row.invoice.amount),
  Estado: row.invoice.status,
  InvoiceNumber: row.invoice.invoiceNumber,
  TipoPagoID: row.invoice.paymentMethodId,
  AseguradoraID: row.invoice.insurerId,
  DescuentoElderly: Number(row.invoice.elderlyDiscountPercent),
  CodigoPromocional: row.invoice.promotionCode,
  DescuentoPromocional: Number(row.invoice.promotionalDiscountPercent),
  RTN: row.invoice.taxRegistrationNumber,
  CAI: row.invoice.cai,
  TipoVisita: row.encounterType ? legacyVisitType(row.encounterType) : null,
  Paciente: row.patient ? `${row.patient.firstName} ${row.patient.lastName}`.trim() : '',
  Doctor: row.staff ? `${row.staff.firstName} ${row.staff.lastName}`.trim() : '',
})

export class MysqlInvoiceRepository implements InvoiceRepository {
  async findAll(args: { limit: number; offset: number; term: string }): Promise<Array<Record<string, unknown>>> {
    const filter = this.invoiceFilter(args.term)
    const db = TenantContext.getDb()
    const [rows, totals] = await Promise.all([
      this.baseQuery()
        .where(filter)
        .orderBy(desc(invoices.issuedAt))
        .limit(args.limit)
        .offset(args.offset),
      db.select({ total: count() })
        .from(invoices)
        .leftJoin(patients, eq(invoices.patientId, patients.id))
        .where(filter),
    ])
    const total = totals[0]?.total ?? 0
    return rows.map((row) => ({ ...legacyInvoice(row), total_registries: total }))
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Record<string, unknown> | null> {
    const [row] = await this.baseQuery()
      .where(and(eq(invoices.invoiceNumber, invoiceNumber), isNull(invoices.deletedAt)))
      .limit(1)
    return row ? legacyInvoice(row) : null
  }

  async findLatestPendingByPatientAndDate(patientId: string, occurredAt: string): Promise<Record<string, unknown> | null> {
    const end = new Date(occurredAt)
    end.setDate(end.getDate() + 1)
    const [row] = await this.baseQuery()
      .where(and(
        eq(invoices.patientId, patientId),
        eq(invoices.status, 'Pendiente'),
        lt(invoices.issuedAt, end),
        isNull(invoices.deletedAt),
      ))
      .orderBy(desc(invoices.issuedAt))
      .limit(1)
    return row ? legacyInvoice(row) : null
  }

  async create(data: Record<string, unknown>): Promise<string> {
    const [created] = await TenantContext.getDb()
      .insert(invoices)
      .values({
        patientId: this.optionalString(data.PacienteID),
        staffMemberId: this.optionalString(data.PersonalID),
        paymentMethodId: this.optionalString(data.TipoPagoID),
        insurerId: this.optionalString(data.AseguradoraID),
        invoiceNumber: String(data.InvoiceNumber),
        issuedAt: data.FechaFactura ? new Date(String(data.FechaFactura)) : new Date(),
        amount: this.money(data.Monto),
        status: this.status(data.Estado),
        elderlyDiscountPercent: this.money(data.DescuentoElderly),
        promotionCode: this.optionalString(data.CodigoPromocional),
        promotionalDiscountPercent: this.money(data.DescuentoPromocional),
        taxRegistrationNumber: this.optionalString(data.RTN),
        cai: this.optionalString(data.CAI),
      })
      .$returningId()
    return created.id
  }

  async updateByInvoiceNumber(invoiceNumber: string, data: Record<string, unknown>): Promise<void> {
    const set: Partial<typeof invoices.$inferInsert> = {}
    if ('PacienteID' in data) set.patientId = this.optionalString(data.PacienteID)
    if ('PersonalID' in data) set.staffMemberId = this.optionalString(data.PersonalID)
    if ('TipoPagoID' in data) set.paymentMethodId = this.optionalString(data.TipoPagoID)
    if ('AseguradoraID' in data) set.insurerId = this.optionalString(data.AseguradoraID)
    if ('FechaFactura' in data) set.issuedAt = new Date(String(data.FechaFactura))
    if ('Monto' in data) set.amount = this.money(data.Monto)
    if ('Estado' in data) set.status = this.status(data.Estado)
    if ('DescuentoElderly' in data) set.elderlyDiscountPercent = this.money(data.DescuentoElderly)
    if ('CodigoPromocional' in data) set.promotionCode = this.optionalString(data.CodigoPromocional)
    if ('DescuentoPromocional' in data) set.promotionalDiscountPercent = this.money(data.DescuentoPromocional)
    if ('RTN' in data) set.taxRegistrationNumber = this.optionalString(data.RTN)
    if ('CAI' in data) set.cai = this.optionalString(data.CAI)
    await TenantContext.getDb()
      .update(invoices)
      .set(set)
      .where(and(eq(invoices.invoiceNumber, invoiceNumber), isNull(invoices.deletedAt)))
  }

  async incrementAmountById(invoiceId: string, delta: number): Promise<void> {
    await TenantContext.getDb()
      .update(invoices)
      .set({ amount: sql`greatest(0, ${invoices.amount} + ${delta})` })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.status, 'Pendiente'), isNull(invoices.deletedAt)))
  }

  async softDeleteByInvoiceNumber(invoiceNumber: string): Promise<void> {
    await TenantContext.getDb()
      .update(invoices)
      .set({ deletedAt: new Date() })
      .where(and(eq(invoices.invoiceNumber, invoiceNumber), isNull(invoices.deletedAt)))
  }

  async fetchServices(): Promise<Array<Record<string, unknown>>> {
    const rows = await TenantContext.getDb().select().from(services).where(isNull(services.deletedAt))
    return rows.map((service) => ({
      ServicioID: service.id,
      NombreServicio: service.name,
      Descripcion: service.description,
      Precio: service.price,
    }))
  }

  async fetchPaymentMethods(): Promise<Array<Record<string, unknown>>> {
    const rows = await TenantContext.getDb().select().from(paymentMethods).where(isNull(paymentMethods.deletedAt))
    return rows.map((method) => ({ TipoPagoID: method.id, Descripcion: method.description }))
  }

  async fetchDoctors(): Promise<Array<Record<string, unknown>>> {
    const rows = await TenantContext.getDb().select().from(staffMembers).where(isNull(staffMembers.deletedAt))
    return rows.map((staff) => ({
      PersonalID: staff.id,
      NombreDoctor: `${staff.firstName} ${staff.lastName}`.trim(),
    }))
  }

  async fetchReportHeader(term?: string): Promise<Array<Record<string, unknown>>> {
    const now = new Date()
    const start = new Date(now)
    if (term !== 'td') start.setDate(now.getDate() - now.getDay() + 1)
    return [{
      fecha_actual: now.toISOString().slice(0, 10),
      rango_fechas: term === 'td'
        ? now.toLocaleDateString('es-HN')
        : `${start.toLocaleDateString('es-HN')} - ${now.toLocaleDateString('es-HN')}`,
      cajero: 'Cajero General',
      turno: '08:00 - 17:00',
    }]
  }

  async fetchReportSummary(term?: string): Promise<Array<Record<string, unknown>>> {
    const { from, to } = this.reportRange(term)
    const rows = await TenantContext.getDb()
      .select({
        status: invoices.status,
        count: count(),
        total: sum(invoices.amount),
      })
      .from(invoices)
      .where(and(
        isNull(invoices.deletedAt),
        gte(invoices.issuedAt, from),
        lt(invoices.issuedAt, to),
      ))
      .groupBy(invoices.status)
    return rows.map((row) => ({
      estado_factura: row.status === 'Pagado' ? 'Pagado' : 'Pendiente',
      cantidad_facturas: row.count,
      total_monto: Number(row.total ?? 0),
    }))
  }

  async fetchReportPayments(term?: string): Promise<Array<Record<string, unknown>>> {
    const { from, to } = this.reportRange(term)
    const rows = await TenantContext.getDb()
      .select({
        description: paymentMethods.description,
        count: count(),
        total: sum(invoices.amount),
      })
      .from(invoices)
      .leftJoin(paymentMethods, eq(invoices.paymentMethodId, paymentMethods.id))
      .where(and(
        isNull(invoices.deletedAt),
        eq(invoices.status, 'Pagado'),
        gte(invoices.issuedAt, from),
        lt(invoices.issuedAt, to),
      ))
      .groupBy(paymentMethods.description)
    return rows.map((row) => ({
      metodo_pago: row.description ?? 'Sin método',
      cantidad: row.count,
      total_monto: Number(row.total ?? 0),
    }))
  }

  async fetchReportCashbox(term?: string): Promise<Array<Record<string, unknown>>> {
    const payments = await this.fetchReportPayments(term)
    return payments.map((payment) => ({
      descripcion: payment.metodo_pago,
      total_sistema: payment.total_monto,
      conteo_manual: null,
      diferencia: null,
    }))
  }

  async fetchServiceById(id: string): Promise<{ ServicioID: string; NombreServicio: string; Precio: number } | null> {
    const [service] = await TenantContext.getDb()
      .select()
      .from(services)
      .where(and(eq(services.id, id), isNull(services.deletedAt)))
      .limit(1)
    return service ? { ServicioID: service.id, NombreServicio: service.name, Precio: Number(service.price) } : null
  }

  async fetchFirstService(): Promise<{ ServicioID: string; NombreServicio: string; Precio: number } | null> {
    const [service] = await TenantContext.getDb()
      .select()
      .from(services)
      .where(isNull(services.deletedAt))
      .orderBy(services.createdAt)
      .limit(1)
    return service ? { ServicioID: service.id, NombreServicio: service.name, Precio: Number(service.price) } : null
  }

  async findById(facturaId: string): Promise<Record<string, unknown> | null> {
    const [row] = await this.baseQuery()
      .where(and(eq(invoices.id, facturaId), isNull(invoices.deletedAt)))
      .limit(1)
    return row ? legacyInvoice(row) : null
  }

  private baseQuery() {
    return TenantContext.getDb()
      .select({
        invoice: invoices,
        patient: patients,
        staff: staffMembers,
        encounterType: clinicalEncounters.type,
      })
      .from(invoices)
      .leftJoin(patients, eq(invoices.patientId, patients.id))
      .leftJoin(staffMembers, eq(invoices.staffMemberId, staffMembers.id))
      .leftJoin(clinicalEncounters, and(
        eq(clinicalEncounters.invoiceId, invoices.id),
        isNull(clinicalEncounters.deletedAt),
      ))
  }

  private invoiceFilter(term: string) {
    const active = isNull(invoices.deletedAt)
    if (!term.trim()) return active
    return and(active, or(
      like(invoices.invoiceNumber, `%${term}%`),
      like(patients.firstName, `%${term}%`),
      like(patients.lastName, `%${term}%`),
      like(patients.identification, `%${term}%`),
    ))
  }

  private reportRange(term?: string) {
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    if (term !== 'td') from.setDate(from.getDate() - from.getDay() + 1)
    const to = new Date()
    to.setDate(to.getDate() + 1)
    to.setHours(0, 0, 0, 0)
    return { from, to }
  }

  private money(value: unknown): string {
    const amount = Number(value ?? 0)
    return (Number.isFinite(amount) ? amount : 0).toFixed(2)
  }

  private optionalString(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null
    return String(value)
  }

  private status(value: unknown): InvoiceStatus {
    const normalized = String(value ?? 'Pendiente').toLowerCase()
    if (normalized.includes('pag')) return 'Pagado'
    if (normalized.includes('anul')) return 'Anulado'
    return 'Pendiente'
  }
}
