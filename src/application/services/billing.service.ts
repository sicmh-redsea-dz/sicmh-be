import { v4 as uuidv4 } from 'uuid'

import { BillingRepository, BillingFilters } from '../ports/billing.repository'
import { BillingLedgerRepository } from '../ports/billing-ledger.repository'
import { PatientMovementsRepository } from '../ports/patient-movements.repository'
import { PatientEncountersRepository } from '../ports/patient-encounters.repository'
import { InvoiceRepository } from '../ports/invoice.repository'
import { StockService } from './stock.services'
import { PatientsService } from './patients.service'
import {
  BillingItemCategory,
  BillingItemStatus,
  BillingLedgerItem,
  BillingStation,
  EncounterStatus,
  PatientEncounter,
  PatientMovementEvent
} from '../../domain/entities/Billing'
import { AuditActor } from '../../domain/entities/Bed'
import { renderPdfFromHtml } from '../../utils/pdfRenderer'

interface ReportFilters {
  from?: string
  to?: string
  patientIds?: number[]
  station?: string
  status?: string
}

interface ManualChargePayload {
  patientId: number
  patientName?: string
  encounterId?: string
  invoiceNumber?: string
  station?: BillingStation | string
  category?: BillingItemCategory
  description: string
  quantity?: number
  unitPrice?: number
  occurredAt?: string
  status?: BillingItemStatus
}

interface MovementChargePayload {
  station?: BillingStation | string
  category?: BillingItemCategory
  description?: string
  quantity?: number
  unitPrice?: number
  occurredAt?: string
  status?: BillingItemStatus
}

interface MovementPayload {
  patientId: number
  patientName?: string
  encounterId?: string
  doctorId?: number
  doctorName?: string
  fromStation?: BillingStation | string
  toStation: BillingStation | string
  occurredAt?: string
  reason?: string
  notes?: string
  source?: PatientMovementEvent['source']
  reference?: PatientMovementEvent['reference']
  charge?: MovementChargePayload
}

const DEFAULT_STATUS: BillingItemStatus = 'Pendiente'

export class BillingService {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly stockService: StockService,
    private readonly billingRepo: BillingRepository,
    private readonly ledgerRepo: BillingLedgerRepository,
    private readonly movementsRepo: PatientMovementsRepository,
    private readonly encountersRepo: PatientEncountersRepository,
    private readonly invoiceRepo: InvoiceRepository
  ) {}

  getReport = async (filters: ReportFilters) => {
    const { from, to } = this.normalizeRange(filters.from, filters.to)
    const patientIds = filters.patientIds ?? []
    const stationFilter = this.normalizeFilter(filters.station)
    const statusFilter = this.normalizeFilter(filters.status)

    const billingFilters: BillingFilters = { from, to, patientIds }

    const [invoiceRows, inventoryRows, ledgerStore, movementStore] = await Promise.all([
      this.billingRepo.fetchInvoiceLedger(billingFilters),
      this.billingRepo.fetchInventoryLedger(billingFilters),
      this.ledgerRepo.load(),
      this.movementsRepo.load()
    ])

    const manualItems = ledgerStore.items.filter((item) => {
      if (!this.isWithinRange(item.occurredAt, from, to)) return false
      if (patientIds.length > 0 && !patientIds.includes(item.patientId)) return false
      return true
    })

    const invoiceItems: BillingLedgerItem[] = invoiceRows.map((row) => {
      const amount = Number(row.Monto) || 0
      return {
        id: `invoice-${row.InvoiceNumber}`,
        patientId: row.PacienteID,
        patientName: row.Paciente,
        station: this.mapVisitTypeToStation(row.TipoVisita),
        category: 'factura',
        description: row.TipoVisita ? `Factura - ${row.TipoVisita}` : 'Factura',
        quantity: 1,
        unitPrice: amount,
        total: amount,
        occurredAt: this.dateOnly(row.FechaFactura),
        status: this.normalizeStatus(row.Estado),
        source: 'invoice',
        reference: { invoiceNumber: row.InvoiceNumber }
      }
    })

    const inventoryItems: BillingLedgerItem[] = inventoryRows.map((row) => {
      const unitPrice = Number(row.PrecioUnidad) || 0
      const quantity = Number(row.Cantidad) || 0
      const total = Number(row.total) || unitPrice * quantity
      return {
        id: `stock-${row.FacturaID}-${row.ProductoID}`,
        patientId: row.PacienteID,
        patientName: row.Paciente,
        station: this.mapVisitTypeToStation(row.TipoVisita),
        category: 'insumo',
        description: row.NombreProducto,
        quantity,
        unitPrice,
        total,
        occurredAt: this.dateOnly(row.FechaFactura),
        status: this.normalizeStatus(row.Estado),
        source: 'stock',
        reference: {
          invoiceNumber: row.InvoiceNumber,
          productId: row.ProductoID
        }
      }
    })

    let ledgerItems = [...invoiceItems, ...inventoryItems, ...manualItems]
      .filter((item) => item.status !== 'Anulado')

    if (stationFilter) {
      ledgerItems = ledgerItems.filter((item) =>
        this.normalizeFilter(item.station) === stationFilter
      )
    }

    if (statusFilter) {
      ledgerItems = ledgerItems.filter((item) =>
        this.normalizeFilter(item.status) === statusFilter
      )
    }

    const movements = movementStore.events.filter((event) => {
      if (!this.isWithinRange(event.occurredAt, from, to)) return false
      if (patientIds.length > 0 && !patientIds.includes(event.patientId)) return false
      if (stationFilter && this.normalizeFilter(event.toStation) !== stationFilter) return false
      return true
    })

    ledgerItems.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    movements.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

    const summary = this.buildSummary({
      from,
      to,
      ledgerItems,
      movements
    })

    return {
      summary,
      ledger: ledgerItems,
      movements
    }
  }

  createManualCharge = async (payload: ManualChargePayload) => {
    const errors: string[] = []
    if (!payload.patientId) errors.push('Paciente requerido.')
    if (!payload.description || !payload.description.trim()) errors.push('Descripción requerida.')
    if (errors.length > 0) throw this.buildValidationError(errors)

    const patientName = await this.resolvePatientName(payload.patientId, payload.patientName)
    const encounter = await this.resolveChargeEncounter({
      patientId: payload.patientId,
      patientName,
      encounterId: payload.encounterId,
      invoiceNumber: payload.invoiceNumber,
      occurredAt: payload.occurredAt
    })
    if (!encounter) {
      throw this.buildValidationError(['No hay factura pendiente activa para este paciente.'])
    }
    if (this.normalizeFilter(encounter.status) !== this.normalizeFilter('Pendiente')) {
      throw this.buildValidationError(['La factura asociada no está pendiente.'])
    }
    await this.touchEncounter(encounter.id)
    const quantity = Number(payload.quantity ?? 1)
    const unitPrice = Number(payload.unitPrice ?? 0)
    const total = quantity * unitPrice
    const item: BillingLedgerItem = {
      id: uuidv4(),
      patientId: payload.patientId,
      patientName,
      encounterId: encounter.id,
      invoiceNumber: encounter.invoiceNumber,
      station: payload.station ?? 'otros',
      category: payload.category ?? 'otros',
      description: payload.description.trim(),
      quantity,
      unitPrice,
      total,
      occurredAt: payload.occurredAt ?? new Date().toISOString(),
      status: payload.status ?? DEFAULT_STATUS,
      source: 'manual'
    }

    const invoice = await this.resolveInvoiceByEncounter(encounter)
    if (invoice?.InvoiceNumber) {
      item.reference = { ...item.reference, invoiceNumber: invoice.InvoiceNumber }
    }

    await this.ledgerRepo.update((store) => {
      store.items.unshift(item)
      store.updatedAt = new Date().toISOString()
    })

    await this.applyInvoiceDeltaSafely(invoice, total, 'manual-charge')

    return item
  }

  updateManualCharge = async (id: string, payload: Partial<ManualChargePayload>) => {
    let previousTotal = 0
    let invoice: Record<string, any> | null = null

    const item = await this.ledgerRepo.update(async (store) => {
      const target = store.items.find((entry) => entry.id === id)
      if (!target) throw this.buildNotFoundError(`No charge found with id ${id}`)
      if (!['manual', 'movement'].includes(target.source)) {
        throw this.buildValidationError(['Solo se pueden editar cargos manuales.'])
      }

      previousTotal = target.total
      const previousInvoiceNumber = target.reference?.invoiceNumber ?? target.invoiceNumber

      if (payload.description !== undefined) target.description = payload.description.trim()
      if (payload.station !== undefined) target.station = payload.station
      if (payload.category !== undefined) target.category = payload.category
      if (payload.quantity !== undefined) target.quantity = Number(payload.quantity)
      if (payload.unitPrice !== undefined) target.unitPrice = Number(payload.unitPrice)
      if (payload.status !== undefined) target.status = payload.status
      if (payload.occurredAt !== undefined) target.occurredAt = payload.occurredAt

      target.total = (target.quantity ?? 0) * (target.unitPrice ?? 0)

      invoice = await this.resolveInvoiceByNumber(previousInvoiceNumber)
      if (invoice?.InvoiceNumber) {
        target.reference = { ...target.reference, invoiceNumber: invoice.InvoiceNumber }
      }

      store.updatedAt = new Date().toISOString()
      return target
    })

    const delta = item.total - previousTotal
    await this.applyInvoiceDeltaSafely(invoice, delta, 'manual-update')

    return item
  }

  removeManualCharge = async (id: string) => {
    let removedTotal = 0
    let invoice: Record<string, any> | null = null

    await this.ledgerRepo.update(async (store) => {
      const index = store.items.findIndex((entry) => entry.id === id)
      if (index === -1) throw this.buildNotFoundError(`No charge found with id ${id}`)

      const item = store.items[index]
      if (!['manual', 'movement'].includes(item.source)) {
        throw this.buildValidationError(['Solo se pueden eliminar cargos manuales.'])
      }

      const invoiceNumber = item.reference?.invoiceNumber ?? item.invoiceNumber
      invoice = await this.resolveInvoiceByNumber(invoiceNumber)

      removedTotal = item.total
      store.items.splice(index, 1)
      store.updatedAt = new Date().toISOString()
    })

    await this.applyInvoiceDeltaSafely(invoice, -removedTotal, 'manual-remove')

    return true
  }

  createMovement = async (payload: MovementPayload, actor?: AuditActor) => {
    const errors: string[] = []
    if (!payload.patientId) errors.push('Paciente requerido.')
    if (!payload.toStation || !payload.toStation.toString().trim()) errors.push('Estación destino requerida.')
    if (errors.length > 0) throw this.buildValidationError(errors)

    const patientName = await this.resolvePatientName(payload.patientId, payload.patientName)
    const occurredAt = payload.occurredAt ?? new Date().toISOString()
    const toStation = payload.toStation

    const encounter = await this.resolveEncounter(payload.patientId, payload.encounterId)
    if (!encounter) {
      throw this.buildValidationError(['No hay factura pendiente activa para este paciente.'])
    }
    if (this.normalizeFilter(encounter.status) !== this.normalizeFilter('Pendiente')) {
      throw this.buildValidationError(['La factura asociada no está pendiente.'])
    }

    let deduped = false
    const event = await this.movementsRepo.update(async (store) => {
      const lastEvent = this.getLastMovement(store.events, payload.patientId, encounter.id)

      if (
        lastEvent &&
        this.normalizeFilter(lastEvent.toStation) === this.normalizeFilter(toStation) &&
        this.dateOnly(lastEvent.occurredAt) === this.dateOnly(occurredAt) &&
        payload.source !== 'manual'
      ) {
        deduped = true
        return lastEvent
      }

      if (payload.doctorId || payload.doctorName) {
        await this.updateEncounterDoctor(encounter.id, payload.doctorId, payload.doctorName)
      }
      await this.touchEncounter(encounter.id)

      const newEvent: PatientMovementEvent = {
        id: uuidv4(),
        patientId: payload.patientId,
        patientName,
        encounterId: encounter.id,
        invoiceNumber: encounter.invoiceNumber,
        fromStation: payload.fromStation ?? lastEvent?.toStation,
        toStation,
        occurredAt,
        reason: payload.reason?.trim(),
        notes: payload.notes?.trim(),
        actor,
        source: payload.source ?? 'manual',
        reference: payload.reference
      }

      store.events.unshift(newEvent)
      store.updatedAt = new Date().toISOString()
      return newEvent
    })

    if (deduped) {
      return { movement: event }
    }

    if (payload.charge) {
      const chargePayload: ManualChargePayload = {
        patientId: payload.patientId,
        patientName,
        encounterId: encounter.id,
        station: payload.charge.station ?? toStation,
        category: payload.charge.category ?? 'otros',
        description: payload.charge.description ?? `Cargo por movimiento a ${toStation}`,
        quantity: payload.charge.quantity ?? 1,
        unitPrice: payload.charge.unitPrice ?? 0,
        occurredAt: payload.charge.occurredAt ?? occurredAt,
        status: payload.charge.status ?? DEFAULT_STATUS
      }

      const charge = await this.createMovementCharge(event.id, chargePayload, encounter)
      return { movement: event, charge }
    }

    return { movement: event }
  }

  getLatestMovementsByPatient = async () => {
    const store = await this.movementsRepo.load()
    const latest = new Map<number, PatientMovementEvent>()
    store.events.forEach((event) => {
      if (!latest.has(event.patientId)) {
        latest.set(event.patientId, event)
      }
    })
    return latest
  }


  getMovementTrailsByPatient = async () => {
    const store = await this.movementsRepo.load()
    const grouped = new Map<number, PatientMovementEvent[]>()
    store.events.forEach((event) => {
      const list = grouped.get(event.patientId) ?? []
      list.push(event)
      grouped.set(event.patientId, list)
    })
    const result = new Map<number, { trail: string[]; lastEvent?: PatientMovementEvent }>()
    grouped.forEach((events, patientId) => {
      events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      const trail: string[] = []
      events.forEach((event) => {
        const station = event.toStation ?? event.fromStation
        if (!station) return
        if (!trail.length || trail[trail.length - 1] != station) {
          trail.push(station)
        }
      })
      const lastEvent = events[events.length - 1]
      result.set(patientId, { trail, lastEvent })
    })
    return result
  }

  getMovementTrailsByInvoice = async () => {
    const store = await this.movementsRepo.load()
    const grouped = new Map<string, PatientMovementEvent[]>()
    store.events.forEach((event) => {
      const key = event.invoiceNumber
      if (!key) return
      const list = grouped.get(key) ?? []
      list.push(event)
      grouped.set(key, list)
    })
    const result = new Map<string, { trail: string[]; lastEvent?: PatientMovementEvent }>()
    grouped.forEach((events, invoiceNumber) => {
      events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      const trail: string[] = []
      events.forEach((event) => {
        const station = event.toStation ?? event.fromStation
        if (!station) return
        if (!trail.length || trail[trail.length - 1] != station) {
          trail.push(station)
        }
      })
      const lastEvent = events[events.length - 1]
      result.set(invoiceNumber, { trail, lastEvent })
    })
    return result
  }

  generateReportPdf = async (filters: ReportFilters) => {
    const report = await this.getReport(filters)
    const html = this.renderReportTemplate(report)
    return renderPdfFromHtml(html)
  }

  private async createMovementCharge(
    movementId: string,
    payload: ManualChargePayload,
    encounter?: PatientEncounter | null
  ) {
    const patientName = await this.resolvePatientName(payload.patientId, payload.patientName)
    const quantity = Number(payload.quantity ?? 1)
    const unitPrice = Number(payload.unitPrice ?? 0)
    const total = quantity * unitPrice

    const resolvedEncounter = encounter ?? await this.resolveEncounter(payload.patientId, payload.encounterId)
    if (!resolvedEncounter) {
      throw this.buildValidationError(['No hay factura pendiente activa para este paciente.'])
    }

    const item: BillingLedgerItem = {
      id: uuidv4(),
      patientId: payload.patientId,
      patientName,
      encounterId: resolvedEncounter.id,
      invoiceNumber: resolvedEncounter.invoiceNumber,
      station: payload.station ?? 'otros',
      category: payload.category ?? 'otros',
      description: payload.description.trim(),
      quantity,
      unitPrice,
      total,
      occurredAt: payload.occurredAt ?? new Date().toISOString(),
      status: payload.status ?? DEFAULT_STATUS,
      source: 'movement',
      reference: { movementId }
    }

    const invoice = await this.resolveInvoiceByEncounter(resolvedEncounter)
    if (invoice) {
      item.reference = { ...item.reference, invoiceNumber: invoice.InvoiceNumber }
    }

    await this.ledgerRepo.update((store) => {
      store.items.unshift(item)
      store.updatedAt = new Date().toISOString()
    })
    await this.applyInvoiceDeltaSafely(invoice, total, 'movement-charge')
    return item
  }

  private async resolvePendingInvoice(
    patientId: number,
    occurredAt: string,
    invoiceNumber?: string
  ): Promise<Record<string, any> | null> {
    if (invoiceNumber) {
      const invoice = await this.invoiceRepo.findByInvoiceNumber(invoiceNumber)
      if (invoice) return invoice
    }
    return this.invoiceRepo.findLatestPendingByPatientAndDate(patientId, occurredAt)
  }

  private async resolveChargeEncounter(args: {
    patientId: number
    patientName: string
    encounterId?: string
    invoiceNumber?: string
    occurredAt?: string
  }) {
    const { patientId, patientName, encounterId, invoiceNumber, occurredAt } = args

    if (invoiceNumber) {
      const invoice = await this.resolvePendingInvoice(
        patientId,
        occurredAt ?? new Date().toISOString(),
        invoiceNumber
      )

      if (!invoice || Number(invoice.PacienteID) !== Number(patientId)) {
        return null
      }

      const status = this.normalizeStatus(invoice.Estado)
      if (this.normalizeFilter(status) !== this.normalizeFilter('Pendiente')) {
        return {
          id: '',
          patientId,
          patientName,
          invoiceNumber,
          status
        } as PatientEncounter
      }

      return this.registerEncounterForInvoice({
        patientId,
        patientName,
        doctorId: invoice.PersonalID,
        invoiceNumber: invoice.InvoiceNumber,
        invoiceId: invoice.FacturaID,
        createdAt: invoice.FechaFactura,
        status
      })
    }

    return this.resolveEncounter(patientId, encounterId)
  }

  private async applyInvoiceDeltaSafely(
    invoice: Record<string, any> | null,
    delta: number,
    reason: string
  ) {
    if (!invoice || !delta) return
    try {
      if (invoice.Estado && this.normalizeFilter(invoice.Estado) !== this.normalizeFilter('Pendiente')) return
      const currentAmount = Number(invoice.Monto ?? 0)
      const nextAmount = Math.max(0, currentAmount + delta)
      await this.invoiceRepo.updateByInvoiceNumber(invoice.InvoiceNumber, { Monto: nextAmount })
    } catch (err) {
      console.warn(`invoice sync skipped (${reason})`, (err as any)?.message || err)
    }
  }

  private buildSummary(args: {
    from: string
    to: string
    ledgerItems: BillingLedgerItem[]
    movements: PatientMovementEvent[]
  }) {
    const { from, to, ledgerItems, movements } = args

    const invoiceItems = ledgerItems.filter((item) => item.source === 'invoice')
    const inventoryItems = ledgerItems.filter((item) => item.source === 'stock')
    const manualItems = ledgerItems.filter((item) => item.source !== 'invoice' && item.source !== 'stock')

    const totals = {
      invoiceTotal: this.sum(invoiceItems),
      invoicePaid: this.sum(invoiceItems.filter((item) => item.status === 'Pagado')),
      invoicePending: this.sum(invoiceItems.filter((item) => item.status === 'Pendiente')),
      inventoryTotal: this.sum(inventoryItems),
      manualTotal: this.sum(manualItems)
    }

    const patientMap = new Map<number, any>()
    const dayMap = new Map<string, any>()
    const categoryMap = new Map<string, any>()
    const stationMap = new Map<string, any>()

    ledgerItems.forEach((item) => {
      const patientEntry = patientMap.get(item.patientId) ?? {
        patientId: item.patientId,
        patientName: item.patientName,
        invoiceTotal: 0,
        inventoryTotal: 0,
        manualTotal: 0,
        total: 0
      }

      if (item.source === 'invoice') {
        patientEntry.invoiceTotal += item.total
        patientEntry.total += item.total
      } else if (item.source === 'stock') {
        patientEntry.inventoryTotal += item.total
      } else {
        patientEntry.manualTotal += item.total
      }
      patientMap.set(item.patientId, patientEntry)

      const dateKey = this.dateOnly(item.occurredAt)
      const dayEntry = dayMap.get(dateKey) ?? {
        date: dateKey,
        invoiceTotal: 0,
        inventoryTotal: 0,
        manualTotal: 0,
        total: 0
      }
      if (item.source === 'invoice') {
        dayEntry.invoiceTotal += item.total
        dayEntry.total += item.total
      } else if (item.source === 'stock') {
        dayEntry.inventoryTotal += item.total
      } else {
        dayEntry.manualTotal += item.total
      }
      dayMap.set(dateKey, dayEntry)

      const categoryKey = item.category ?? 'otros'
      const categoryEntry = categoryMap.get(categoryKey) ?? {
        category: categoryKey,
        total: 0,
        count: 0
      }
      categoryEntry.total += item.total
      categoryEntry.count += 1
      categoryMap.set(categoryKey, categoryEntry)

      const stationKey = item.station ?? 'otros'
      const stationEntry = stationMap.get(stationKey) ?? {
        station: stationKey,
        total: 0,
        count: 0
      }
      stationEntry.total += item.total
      stationEntry.count += 1
      stationMap.set(stationKey, stationEntry)
    })

    return {
      range: { from, to },
      totals,
      counts: {
        patients: patientMap.size,
        invoices: invoiceItems.length,
        movements: movements.length,
        ledgerItems: ledgerItems.length
      },
      byPatient: Array.from(patientMap.values()).sort((a, b) => b.total - a.total),
      byDay: Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
      byCategory: Array.from(categoryMap.values()).sort((a, b) => b.total - a.total),
      byStation: Array.from(stationMap.values()).sort((a, b) => b.total - a.total)
    }
  }

  private sum(items: BillingLedgerItem[]) {
    return items.reduce((acc, item) => acc + (Number(item.total) || 0), 0)
  }

  private normalizeRange(from?: string, to?: string) {
    const parsedTo = this.parseDate(to) ?? this.dateOnly(new Date().toISOString())
    const parsedFrom = this.parseDate(from) ?? this.dateOnly(this.addDays(parsedTo, -7))
    if (parsedFrom > parsedTo) {
      return { from: parsedTo, to: parsedFrom }
    }
    return { from: parsedFrom, to: parsedTo }
  }

  private parseDate(value?: string): string | null {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return this.dateOnly(date.toISOString())
  }

  private addDays(dateStr: string, days: number) {
    const date = new Date(dateStr)
    date.setDate(date.getDate() + days)
    return date.toISOString()
  }

  private isWithinRange(dateStr: string, from: string, to: string) {
    const dateKey = this.dateOnly(dateStr)
    return dateKey >= from && dateKey <= to
  }

  private dateOnly(value: string) {
    return value.toString().split('T')[0]
  }

  private normalizeFilter(value?: string | null) {
    if (!value) return ''
    const normalized = value.toString().trim().toLowerCase()
    if (!normalized || normalized === 'all' || normalized === 'todos') return ''
    return normalized
  }

  private normalizeStatus(value?: string | null): BillingItemStatus {
    if (!value) return DEFAULT_STATUS
    const normalized = value.toString().toLowerCase()
    if (normalized.includes('pag')) return 'Pagado'
    if (normalized.includes('pend')) return 'Pendiente'
    if (normalized.includes('anul')) return 'Anulado'
    return DEFAULT_STATUS
  }

  private mapVisitTypeToStation(visitType?: string | null): BillingStation | undefined {
    if (!visitType) return undefined
    const normalized = visitType.toString().toLowerCase()
    if (normalized.includes('emer')) return 'emergencia'
    if (normalized.includes('hosp')) return 'hospitalizacion'
    if (normalized.includes('quiro')) return 'quirofano'
    if (normalized.includes('consult')) return 'consulta'
    return undefined
  }

  public registerEncounterForInvoice = async (payload: {
    patientId: number
    patientName: string
    doctorId?: number
    doctorName?: string
    origin?: BillingStation | string
    invoiceNumber: string
    invoiceId?: number
    createdAt?: string
    status?: EncounterStatus
  }) => {
    return this.encountersRepo.update((store) => {
      const existing = store.encounters.find((enc) => enc.invoiceNumber === payload.invoiceNumber)

      if (existing) {
        let touched = false
        if (payload.doctorId && !existing.doctorId) {
          existing.doctorId = payload.doctorId
          touched = true
        }
        if (payload.doctorName && !existing.doctorName) {
          existing.doctorName = payload.doctorName.trim()
          touched = true
        }
        if (payload.origin && !existing.origin) {
          existing.origin = payload.origin
          touched = true
        }
        if (payload.invoiceId && !existing.invoiceId) {
          existing.invoiceId = payload.invoiceId
          touched = true
        }
        if (touched) {
          existing.updatedAt = new Date().toISOString()
          store.updatedAt = existing.updatedAt
        }
        return existing
      }

      const now = new Date().toISOString()
      const previous = store.encounters
        .filter((enc) => enc.patientId === payload.patientId)
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]

      const encounter: PatientEncounter = {
        id: uuidv4(),
        patientId: payload.patientId,
        patientName: payload.patientName,
        doctorId: payload.doctorId,
        doctorName: payload.doctorName?.trim() || undefined,
        origin: payload.origin,
        invoiceNumber: payload.invoiceNumber,
        invoiceId: payload.invoiceId,
        status: payload.status ?? 'Pendiente',
        createdAt: payload.createdAt ?? now,
        updatedAt: now,
        previousEncounterId: previous?.id
      }

      store.encounters.unshift(encounter)
      store.updatedAt = now

      return encounter
    })
  }

  public getDefaultConsultaService = async (): Promise<{ id: number; name: string; price: number } | null> => {
    const service = await this.invoiceRepo.fetchServiceById(1) ?? await this.invoiceRepo.fetchFirstService()
    if (!service) {
      console.warn('getDefaultConsultaService: no services found in DB')
      return null
    }
    return {
      id: service.ServicioID,
      name: service.NombreServicio,
      price: parseFloat(String(service.Precio)) || 0
    }
  }

  public addConsultaServiceLedgerItem = async (params: {
    invoiceNumber: string
    patientId: number
    patientName?: string
    encounterId?: string
    occurredAt?: string
    service: { id: number; name: string; price: number }
  }): Promise<void> => {
    const { invoiceNumber, patientId, patientName, encounterId, occurredAt, service } = params

    await this.ledgerRepo.update((store) => {
      const alreadyAdded = store.items.some(
        (item) => (item.invoiceNumber === invoiceNumber || item.reference?.invoiceNumber === invoiceNumber)
          && item.description === service.name
      )
      if (alreadyAdded) return

      const item: BillingLedgerItem = {
        id: uuidv4(),
        patientId,
        patientName: patientName ?? '',
        encounterId,
        invoiceNumber,
        station: 'consulta',
        category: 'servicio',
        description: service.name,
        quantity: 1,
        unitPrice: service.price,
        total: service.price,
        occurredAt: occurredAt ?? new Date().toISOString(),
        status: DEFAULT_STATUS,
        source: 'manual'
      }

      store.items.unshift(item)
      store.updatedAt = new Date().toISOString()
    })
  }

  public voidLedgerItemsByInvoice = async (invoiceNumber: string): Promise<void> => {
    await this.ledgerRepo.update((store) => {
      let touched = false
      store.items.forEach((item) => {
        const belongsToInvoice = item.invoiceNumber === invoiceNumber || item.reference?.invoiceNumber === invoiceNumber
        if (belongsToInvoice && item.status !== 'Anulado') {
          item.status = 'Anulado'
          touched = true
        }
      })
      if (touched) {
        store.updatedAt = new Date().toISOString()
      }
    })
  }

  private async resolveEncounter(patientId: number, encounterId?: string) {
    const store = await this.encountersRepo.load()
    const isPending = (enc: PatientEncounter) =>
      this.normalizeFilter(enc.status) === this.normalizeFilter('Pendiente')

    let encounter = encounterId
      ? store.encounters.find((enc) => enc.id === encounterId && enc.patientId === patientId)
      : undefined

    if (encounter && isPending(encounter)) {
      return encounter
    }

    const movementStore = await this.movementsRepo.load()
    const lastEvent = this.getLastMovement(movementStore.events, patientId)
    if (lastEvent?.encounterId) {
      const candidate = store.encounters.find((enc) => enc.id === lastEvent.encounterId)
      if (candidate && isPending(candidate)) {
        return candidate
      }
    }

    const pending = store.encounters
      .filter((enc) => enc.patientId === patientId && isPending(enc))
      .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))

    return pending[0] ?? null
  }

  private async resolveInvoiceByNumber(invoiceNumber?: string) {
    if (!invoiceNumber) return null
    return this.invoiceRepo.findByInvoiceNumber(invoiceNumber)
  }

  private async resolveInvoiceByEncounter(encounter?: PatientEncounter | null) {
    if (!encounter?.invoiceNumber) return null
    return this.invoiceRepo.findByInvoiceNumber(encounter.invoiceNumber)
  }

  public getInvoiceSnapshot = async (invoiceNumber: string) => {
    const invoice = await this.invoiceRepo.findByInvoiceNumber(invoiceNumber)
    if (!invoice) throw this.buildNotFoundError(`Invoice not found: ${invoiceNumber}`)

    const invoiceDate = this.dateOnly(invoice.FechaFactura ?? new Date().toISOString())
    const invoiceRows = await this.billingRepo.fetchInvoiceLedger({
      from: invoiceDate,
      to: invoiceDate,
      patientIds: [invoice.PacienteID]
    })
    const invoiceRow = invoiceRows.find((row) => row.InvoiceNumber === invoiceNumber)

    const encounterStore = await this.encountersRepo.load()
    const encounter = encounterStore.encounters.find((enc) => enc.invoiceNumber === invoiceNumber)

    const ledgerStore = await this.ledgerRepo.load()
    const manualItems = ledgerStore.items.filter((item) => {
      const matchInvoice = item.invoiceNumber === invoiceNumber || item.reference?.invoiceNumber === invoiceNumber
      const matchEncounter = encounter?.id && item.encounterId === encounter.id
      return matchInvoice || matchEncounter
    })

    const stockItems = await this.stockService.findInvoiceItems(invoice.FacturaID)
    const stockCharges: BillingLedgerItem[] = stockItems.map((item) => ({
      id: `stock-${invoice.FacturaID}-${item.id}`,
      patientId: invoice.PacienteID,
      patientName: invoiceRow?.Paciente ?? '',
      encounterId: encounter?.id,
      invoiceNumber,
      station: this.mapVisitTypeToStation(invoiceRow?.TipoVisita),
      category: 'medicamento',
      description: item.name,
      quantity: Number(item.qty) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      total: (Number(item.qty) || 0) * (Number(item.unitPrice) || 0),
      occurredAt: invoiceDate,
      status: this.normalizeStatus(invoice.Estado),
      source: 'stock',
      reference: {
        invoiceNumber,
        productId: item.id
      }
    }))

    const charges = [...stockCharges, ...manualItems]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

    const subtotal = charges.reduce((acc, item) => acc + (Number(item.total) || 0), 0)
    const elderlyPercent = Number(invoice.DescuentoElderly ?? 0)
    const promoPercent = Number(invoice.DescuentoPromocional ?? 0)
    const totalPercent = Math.min(100, Math.max(0, elderlyPercent + promoPercent))
    const discountAmount = subtotal * (totalPercent / 100)
    const total = Math.max(0, subtotal - discountAmount)

    return {
      invoice: {
        id: invoice.FacturaID,
        invoiceNumber,
        patientId: invoice.PacienteID,
        patientName: invoiceRow?.Paciente ?? '',
        doctorName: invoiceRow?.Doctor ?? '',
        date: invoiceDate,
        status: this.normalizeStatus(invoice.Estado),
        visitType: invoiceRow?.TipoVisita ?? null,
        amount: Number(invoice.Monto ?? 0),
        discounts: {
          elderlyPercent,
          promoPercent,
          promoCode: invoice.CodigoPromocional ?? ''
        }
      },
      summary: {
        subtotal,
        discountAmount,
        total
      },
      charges
    }
  }

  public transferInvoiceContext = async (payload: {
    fromInvoiceNumber: string
    fromInvoiceId?: number
    toInvoiceNumber: string
    toInvoiceId?: number
    patientId?: number
    patientName?: string
    doctorId?: number
    doctorName?: string
    origin?: BillingStation | string
  }) => {
    const now = new Date().toISOString()

    const newEncounter = await this.encountersRepo.update(async (store) => {
      const previous = store.encounters.find((enc) => enc.invoiceNumber === payload.fromInvoiceNumber)
      if (previous) {
        previous.status = 'Anulado'
        previous.closedAt = now
        previous.updatedAt = now
      }

      const patientId = payload.patientId ?? previous?.patientId
      if (!patientId) throw this.buildValidationError(['Paciente requerido para transferir factura.'])

      const patientName = payload.patientName
        ?? previous?.patientName
        ?? await this.resolvePatientName(patientId)

      const encounter: PatientEncounter = {
        id: uuidv4(),
        patientId,
        patientName,
        doctorId: payload.doctorId ?? previous?.doctorId,
        doctorName: payload.doctorName ?? previous?.doctorName,
        origin: payload.origin ?? previous?.origin,
        invoiceNumber: payload.toInvoiceNumber,
        invoiceId: payload.toInvoiceId,
        status: 'Pendiente',
        createdAt: now,
        updatedAt: now,
        previousEncounterId: previous?.id
      }

      store.encounters.unshift(encounter)
      store.updatedAt = now

      return encounter
    })

    let manualTotal = 0
    await this.ledgerRepo.update((ledgerStore) => {
      ledgerStore.items.forEach((item) => {
        const matchInvoice = item.invoiceNumber === payload.fromInvoiceNumber || item.reference?.invoiceNumber === payload.fromInvoiceNumber
        const matchEncounter = newEncounter.previousEncounterId && item.encounterId === newEncounter.previousEncounterId
        if (!matchInvoice && !matchEncounter) return

        item.encounterId = newEncounter.id
        item.invoiceNumber = payload.toInvoiceNumber
        item.reference = { ...item.reference, invoiceNumber: payload.toInvoiceNumber }
        manualTotal += Number(item.total) || 0
      })
      ledgerStore.updatedAt = now
    })

    await this.movementsRepo.update((movementStore) => {
      let movedEvents = 0
      movementStore.events.forEach((event) => {
        const matchInvoice = event.invoiceNumber === payload.fromInvoiceNumber
        const matchEncounter = newEncounter.previousEncounterId && event.encounterId === newEncounter.previousEncounterId
        if (!matchInvoice && !matchEncounter) return

        event.encounterId = newEncounter.id
        event.invoiceNumber = payload.toInvoiceNumber
        movedEvents += 1
      })

      if (movedEvents > 0) {
        movementStore.updatedAt = now
      }
    })

    let stockTotal = 0
    if (payload.fromInvoiceId && payload.toInvoiceId) {
      const copied = await this.stockService.copyInvoiceItems(payload.fromInvoiceId, payload.toInvoiceId)
      stockTotal = Number(copied.amount) || 0
    }

    const nextTotal = manualTotal + stockTotal
    if (nextTotal > 0) {
      await this.invoiceRepo.updateByInvoiceNumber(payload.toInvoiceNumber, { Monto: nextTotal })
    }

    return {
      encounter: newEncounter,
      totals: { manualTotal, stockTotal, total: nextTotal }
    }
  }

  public updateEncounterStatusByInvoice = async (invoiceNumber: string, status: EncounterStatus) => {
    return this.encountersRepo.update((store) => {
      const encounter = store.encounters.find((enc) => enc.invoiceNumber === invoiceNumber)
      if (!encounter) return null
      const now = new Date().toISOString()
      encounter.status = status
      encounter.updatedAt = now
      if (status === 'Pagado' || status === 'Anulado') {
        encounter.closedAt = now
      }
      store.updatedAt = now
      return encounter
    })
  }

  private async touchEncounter(encounterId: string) {
    await this.encountersRepo.update((store) => {
      const target = store.encounters.find((enc) => enc.id === encounterId)
      if (!target) return
      const now = new Date().toISOString()
      target.updatedAt = now
      store.updatedAt = now
    })
  }

  private async updateEncounterDoctor(encounterId: string, doctorId?: number, doctorName?: string) {
    if (!doctorId && !doctorName) return
    await this.encountersRepo.update((store) => {
      const target = store.encounters.find((enc) => enc.id === encounterId)
      if (!target) return
      if (doctorId) target.doctorId = doctorId
      if (doctorName) target.doctorName = doctorName.trim()
      const now = new Date().toISOString()
      target.updatedAt = now
      store.updatedAt = now
    })
  }

  private async resolvePatientName(patientId: number, providedName?: string) {
    if (providedName && providedName.trim()) return providedName.trim()
    const patient = await this.patientsService.findOnePatient(patientId)
    return `${patient.name} ${patient.lastName}`.trim()
  }

  private getLastMovement(events: PatientMovementEvent[], patientId: number, encounterId?: string) {
    return events.find((event) => event.patientId === patientId && (!encounterId || event.encounterId === encounterId)) ?? null
  }

  private buildValidationError(messages: string[]) {
    const err: any = new Error('Validation error')
    err.name = 'validation_errors'
    err.errors = messages.map((msg) => ({ msg }))
    return err
  }

  private buildNotFoundError(message: string) {
    const err: any = new Error(message)
    err.name = 'not_found_error'
    return err
  }

  private renderReportTemplate(report: any) {
    const { summary, ledger, movements } = report
    const summaryRows = [
      { label: 'Total facturado', value: summary.totals.invoiceTotal },
      { label: 'Pagado', value: summary.totals.invoicePaid },
      { label: 'Pendiente', value: summary.totals.invoicePending },
      { label: 'Consumo inventario', value: summary.totals.inventoryTotal },
      { label: 'Cargos por servicios', value: summary.totals.manualTotal }
    ]
      .map(
        (row) => `
        <tr>
          <td>${row.label}</td>
          <td>${Number(row.value).toFixed(2)}</td>
        </tr>
      `
      )
      .join('')

    const ledgerRows = ledger
      .map(
        (item: BillingLedgerItem) => `
        <tr>
          <td>${item.occurredAt}</td>
          <td>${item.patientName}</td>
          <td>${item.station ?? '-'}</td>
          <td>${item.category}</td>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${Number(item.unitPrice).toFixed(2)}</td>
          <td>${Number(item.total).toFixed(2)}</td>
          <td>${item.source}</td>
        </tr>
      `
      )
      .join('')

    const movementRows = movements
      .map(
        (event: PatientMovementEvent) => `
        <tr>
          <td>${event.occurredAt}</td>
          <td>${event.patientName}</td>
          <td>${event.fromStation ?? '-'}</td>
          <td>${event.toStation}</td>
          <td>${event.reason ?? '-'}</td>
        </tr>
      `
      )
      .join('')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            * { box-sizing: border-box; font-family: 'Roboto', sans-serif; }
            body { margin: 24px; font-size: 12px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 4px; color: #1f2a44; }
            h2 { font-size: 14px; margin: 16px 0 8px; color: #1f2a44; }
            .meta { display: flex; gap: 24px; font-size: 12px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th, td { border: 1px solid #cbd5f5; padding: 6px; text-align: left; }
            th { background: #f1f5f9; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>Reporte de facturación</h1>
          <div class="meta">
            <div>Rango: ${summary.range.from} - ${summary.range.to}</div>
            <div>Pacientes: ${summary.counts.patients}</div>
            <div>Movimientos: ${summary.counts.movements}</div>
          </div>

          <h2>Resumen</h2>
          <table>
            <thead><tr><th>Concepto</th><th>Monto</th></tr></thead>
            <tbody>${summaryRows}</tbody>
          </table>

          <h2>Detalle de cargos</h2>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Estación</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Total</th>
                <th>Origen</th>
              </tr>
            </thead>
            <tbody>${ledgerRows}</tbody>
          </table>

          <h2>Movimientos</h2>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Desde</th>
                <th>Hacia</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>${movementRows}</tbody>
          </table>
        </body>
      </html>
    `
  }
}
