import { VisitsRepository } from '../ports/visits.repository'
import { HistoryMapper } from '../../domain/mappers/HistoryMapper'
import { StaffService } from './staff.service'
import { PatientsService } from './patients.service'
import { StockService } from './stock.services'
import { InvoiceService } from './invoice.service'
import { BillingService } from './billing.service'
import { StaffMapper } from '../../domain/mappers/StaffMapper'
import { PatientMapper } from '../../domain/mappers/PatientMapper'
import { StockMapper } from '../../domain/mappers/StockMapper'
import { ExpedientePayload, ExpedienteExtra, VisitOrigin } from '../../domain/entities/Expediente'
import { ExpedienteRepository } from '../ports/expediente.repository'
import { TenantContext } from '../../infrastructure/database/TenantContext'
import { requireQuantity } from '../../infrastructure/repositories/inventory-balances'

interface CreateVisitPayload {
    BMI: number
    ageAccordingToWeight: number
    date: string
    diagnosis: string
    doctor: string
    fatPercentage: number
    glucometry: number
    height: number
    notes: string
    oxygenation: number
    patient: string
    pressure: string
    temperature: number
    treatment: string
    visceralFat: number
    weight: number
    familyHst: string
    backgroundHst: string
    pathologicalHst: string
    surgicalHst: string
    stockItems?: { id: string; qty: number; subinventoryId?: string }[]
    origin: string
    expediente?: ExpedientePayload
}

interface EditVisitPayload {
    id: string,
    body: CreateVisitPayload
}

interface DelimitersArgs {
    limit: number,
    offset: number
    term: string
    ext: string
}

const VALID_ORIGINS: VisitOrigin[] = ['visits', 'emergency', 'hospitalization', 'oroom']

const ORIGIN_TO_VISIT_TYPE: Record<VisitOrigin, string> = {
    visits: 'Consulta',
    emergency: 'Emergencia',
    hospitalization: 'Hospitalizacion',
    oroom: 'Quirofano'
}

const VISIT_TYPE_TO_ORIGIN: Record<string, VisitOrigin> = {
    Consulta: 'visits',
    Emergencia: 'emergency',
    Hospitalizacion: 'hospitalization',
    Quirofano: 'oroom'
}

export class VisitsService {

    private staffService: StaffService
    private stockService: StockService
    private patientService: PatientsService
    private invoiceService: InvoiceService
    private billingService: BillingService
    private visitsRepo: VisitsRepository
    private expedienteRepo: ExpedienteRepository

    constructor(
        staffService: StaffService,
        patientService: PatientsService,
        stockService: StockService,
        invoiceService: InvoiceService,
        billingService: BillingService,
        visitsRepo: VisitsRepository,
        expedienteRepo: ExpedienteRepository
    ) {
        this.staffService = staffService
        this.patientService = patientService
        this.stockService = stockService
        this.invoiceService = invoiceService
        this.billingService = billingService
        this.visitsRepo = visitsRepo
        this.expedienteRepo = expedienteRepo
    }

    findAllVisits = async (args: DelimitersArgs): Promise<any> => {
        try {
            const originKey = this.parseOriginForList(args.ext)
            const targetStation = originKey ? this.mapOriginToStation(originKey) : null

            // These four are independent of each other, so fetch them concurrently
            // instead of serializing four separate round-trips.
            const [movementMap, visitHistory, staff, patients] = await Promise.all([
                this.billingService.getMovementTrailsByInvoice(),
                // Station filtering (emergency/hospitalization/oroom) happens below against
                // movement-trail data, which is currently filtered after fetching
                // active visits (capped at 5000
                // as a safety limit) before applying the requested page.
                originKey && originKey !== 'visits'
                    ? this.visitsRepo.findAllUnbounded({ term: args.term, ext: '' })
                    : this.visitsRepo.findAll(args),
                this.staffService.getAllDocs(),
                this.patientService.findAllPatients({ limit: 100, offset: 0 })
            ])

            const enriched = visitHistory.map((visit) => {
                const originFromVisit = VISIT_TYPE_TO_ORIGIN[visit.TipoVisita] as VisitOrigin | undefined
                const originStation = originFromVisit
                    ? this.mapOriginToStation(originFromVisit)
                    : this.mapVisitTypeToStation(visit.TipoVisita)
                const base = HistoryMapper.toHistoryResponse(visit)
                const invoiceNumber = base.invoiceNumber || (visit as any).InvoiceNumber
                const movementData = invoiceNumber ? movementMap.get(invoiceNumber) : undefined
                const movementTrail = this.buildMovementTrail(originStation, movementData?.trail)
                const lastMovement = movementData?.lastEvent
                const currentStation = lastMovement?.toStation ?? originStation
                const movementFrom = lastMovement ? (lastMovement.fromStation ?? originStation ?? '') : ''
                const movementTo = lastMovement ? (lastMovement.toStation ?? '') : ''
                const movementAt = lastMovement ? (lastMovement.occurredAt ?? '') : ''
                const movedTo = this.normalizeStation(originStation) &&
                    this.normalizeStation(currentStation) &&
                    this.normalizeStation(originStation) !== this.normalizeStation(currentStation)
                    ? String(currentStation)
                    : ''

                return {
                    ...base,
                    originStation: originStation ?? '',
                    currentStation: currentStation ?? '',
                    movedTo,
                    movementFrom,
                    movementTo,
                    movementAt,
                    movementTrail
                }
            })

            const filtered = targetStation && originKey !== 'visits'
                ? enriched.filter((visit) =>
                    this.isStationInTrail(visit.movementTrail, targetStation)
                )
                : enriched

            const totalRecords = originKey && originKey !== 'visits'
                ? filtered.length
                : visitHistory.length > 0 ? visitHistory[0].total_registries : 0

            const paginated = originKey && originKey !== 'visits'
                ? filtered.slice(args.offset, args.offset + args.limit)
                : filtered

            return {
                visits: paginated,
                staff,
                patients: patients.patients,
                totalRecords
            }
        } catch (err: any) {
            console.log('the err :::: ', err.message)
            throw err
        }

    }

    findVisitById = async (id: string): Promise<any> => {
        try {
            const medicalHistory = await this.visitsRepo.findById(id)
            if (!medicalHistory)
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}`)
            const stock = await this.stockService.findAll()
            const expediente = await this.expedienteRepo.findByHistoryId(id)
            const expedientePayload = expediente ? { standard: expediente.standard, module: expediente.module } : null
            return {
                visit: {
                    ...HistoryMapper.toHistoryFormResponse(medicalHistory),
                    expediente: expedientePayload
                },
                stock
            }
        } catch (err) {
            throw err
        }
    }

    createVisit = async (payload: CreateVisitPayload): Promise<any> => {
        const { stockItems = [], date, doctor, patient, origin, expediente } = payload
        const originKey = this.assertOrigin(origin)
        this.validateExpediente(expediente, originKey)
        this.validateStockItems(stockItems)
        return TenantContext.withLock('clinical_workflows', async () => {
            const fields = this.removeUndefined(HistoryMapper.toDbForm(payload))
            fields.isActive = true
            fields.TipoVisita = ORIGIN_TO_VISIT_TYPE[originKey]
            const consultaService = originKey === 'visits' ? await this.billingService.getDefaultConsultaService() : null
            const amount = await this.stockService.readAmountByStockQty(stockItems) + (consultaService?.price ?? 0)
            const invoice = await this.invoiceService.createInvoice({ date, doctor, patient, amount })
            fields.FacturaID = invoice.id
            const visitId = await this.visitsRepo.create(fields)
            if (stockItems.length) {
                await this.stockService.reduceStockQuantities(stockItems, visitId)
                await this.stockService.insertStockInvoice(invoice.id, stockItems)
                await this.stockService.insertStockHistory(visitId, stockItems)
            }
            if (expediente) {
                const now = new Date().toISOString()
                await this.expedienteRepo.upsert(visitId, {
                    historyId: visitId, patientId: patient, origin: originKey,
                    standard: expediente.standard, module: expediente.module, createdAt: now, updatedAt: now,
                })
            }
            const patientInfo = await this.patientService.findOnePatient(patient)
            const patientName = `${patientInfo.name} ${patientInfo.lastName}`.trim()
            const encounter = await this.billingService.registerEncounterForInvoice({
                patientId: patient, patientName, doctorId: doctor, origin: this.mapOriginToStation(originKey),
                invoiceNumber: invoice.invoiceNumber, invoiceId: invoice.id, createdAt: date,
            })
            await this.billingService.createMovement({
                patientId: patient, patientName, encounterId: encounter.id, toStation: this.mapOriginToStation(originKey),
                occurredAt: date, source: 'visit', reference: { visitId },
            })
            if (consultaService) await this.billingService.addConsultaServiceLedgerItem({
                invoiceNumber: invoice.invoiceNumber, patientId: patient, patientName, encounterId: encounter.id,
                occurredAt: date, service: consultaService,
            })
            return { visit: visitId }
        })
    }

    private validateStockItems(items: { id: string; qty: number }[]) {
        const ids = new Set<string>()
        for (const item of items) {
            requireQuantity(item.qty)
            if (ids.has(item.id)) throw this.errorHandler('validation_errors', 'No repita un producto en la misma solicitud.')
            ids.add(item.id)
        }
    }

    private removeUndefined(obj: Record<string, any>): Record<string, any> {
        return Object.fromEntries(
            Object.entries(obj).filter(([_, value]) => value !== undefined)
        );
    }

    // Returns signed deltas: positive means more stock must be consumed,
    // negative means stock must be restored (quantity reduced or item removed
    // entirely from the visit). Both directions must be applied by the caller,
    // or edits that reduce usage never give the inventory/invoice back.
    private computeStockDelta(
        previous: { stockId: string; stockQty: number }[],
        incoming: { id: string; qty: number; subinventoryId?: string }[]
    ) {
        const prevMap = new Map<string, number>()
        previous.forEach((item) => {
            const qty = Number(item.stockQty) || 0
            prevMap.set(item.stockId, qty)
        })

        const incomingIds = new Set(incoming.map((item) => item.id))
        const deltaItems: { id: string; qty: number; subinventoryId?: string }[] = []

        incoming.forEach((item) => {
            const nextQty = Number(item.qty) || 0
            const prevQty = prevMap.get(item.id) ?? 0
            const delta = nextQty - prevQty
            if (delta !== 0) {
                deltaItems.push({ id: item.id, qty: delta, subinventoryId: item.subinventoryId })
            }
        })

        previous.forEach((item) => {
            if (incomingIds.has(item.stockId)) return
            const prevQty = Number(item.stockQty) || 0
            if (prevQty > 0) {
                deltaItems.push({ id: item.stockId, qty: -prevQty })
            }
        })

        return deltaItems
    }

    private mapOriginToStation(origin: VisitOrigin) {
        switch (origin) {
            case 'emergency':
                return 'emergencia'
            case 'hospitalization':
                return 'hospitalizacion'
            case 'oroom':
                return 'quirofano'
            case 'visits':
            default:
                return 'consulta'
        }
    }

    private parseOriginForList(origin?: string): VisitOrigin | null {
        if (!origin) return null
        const normalized = origin.trim()
        if (normalized === 'o-room') return 'oroom'
        const normalizedOrigin = normalized as VisitOrigin
        return VALID_ORIGINS.includes(normalizedOrigin) ? normalizedOrigin : null
    }

    private mapVisitTypeToStation(visitType?: string | null) {
        if (!visitType) return ''
        const normalized = visitType.toString().toLowerCase()
        if (normalized.includes('emer')) return 'emergencia'
        if (normalized.includes('hosp')) return 'hospitalizacion'
        if (normalized.includes('quiro')) return 'quirofano'
        if (normalized.includes('consult')) return 'consulta'
        return ''
    }

    private buildMovementTrail(originStation?: string | null, trail?: (string | undefined)[]) {
        const path: string[] = []
        const push = (value?: string | null) => {
            const normalized = this.normalizeStation(value)
            if (!normalized) return
            if (!path.length || path[path.length - 1] !== normalized) {
                path.push(normalized)
            }
        }
        push(originStation ?? undefined)
        if (trail && trail.length > 0) {
            trail.forEach((value) => push(value))
        }
        return path
    }

    private isStationInTrail(trail: string[] | undefined, station?: string | null) {
        if (!trail || !trail.length) return false
        const normalized = this.normalizeStation(station)
        if (!normalized) return false
        return trail.some((value) => this.normalizeStation(value) === normalized)
    }

    private normalizeStation(value?: string | null) {
        if (!value) return ''
        return value.toString().trim().toLowerCase()
    }


    editVisit = async (editVisitPayload: EditVisitPayload): Promise<any> => {
        return TenantContext.withLock('clinical_workflows', async () => {
            const { id, body } = editVisitPayload;
            const originKey = await this.resolveOrigin(body, id)
            this.validateExpediente(body.expediente, originKey)

            const existingVisit = await this.visitsRepo.findById(id)
            if (!existingVisit) {
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`);
            }

            const existingInventory = HistoryMapper.toHistoryFormResponse(existingVisit).usedInventory ?? []
            const incomingInventory = Array.isArray(body.stockItems) ? body.stockItems : existingInventory.map(item => ({ id: item.stockId, qty: Number(item.stockQty) }))
            this.validateStockItems(incomingInventory)
            const stockDelta = this.computeStockDelta(existingInventory, incomingInventory)

            const fieldsForVisit = HistoryMapper.toDbForm(body)
            const translatedFields = this.removeUndefined(fieldsForVisit)

            try {
                const affectedRows = await this.visitsRepo.update(id, translatedFields)
                if (affectedRows === 0) {
                    throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`);
                }

                if (body.expediente) {
                    const existingExpediente = await this.expedienteRepo.findByHistoryId(id)
                    const now = new Date().toISOString()
                    const expedienteRecord: ExpedienteExtra = {
                        historyId: id,
                        patientId: body.patient ?? existingExpediente?.patientId,
                        origin: originKey,
                        standard: body.expediente.standard,
                        module: body.expediente.module,
                        createdAt: existingExpediente?.createdAt ?? now,
                        updatedAt: now
                    }
                    await this.expedienteRepo.upsert(id, expedienteRecord)
                }

                if (stockDelta.length > 0) {
                    const invoice = await this.invoiceService.getInvByFacturaId(existingVisit.FacturaID)
                    if (invoice?.Estado !== 'Pendiente') throw this.errorHandler('validation_errors', 'Solo se pueden modificar insumos de una factura pendiente.')
                    const before = await this.stockService.findInvoiceItems(existingVisit.FacturaID)
                    const increases = stockDelta.filter((item) => item.qty > 0)
                    const decreases = stockDelta.filter((item) => item.qty < 0)

                    if (increases.length > 0) {
                        await this.stockService.reduceStockQuantities(increases, id)
                        await Promise.all([
                            this.stockService.insertStockInvoice(existingVisit.FacturaID, increases),
                            this.stockService.insertStockHistory(id, increases)
                        ])
                    }

                    if (decreases.length > 0) {
                        const restorations = decreases.map((item) => ({ ...item, qty: -item.qty }))
                        await this.stockService.restoreStockQuantities(restorations, id)
                        await Promise.all([
                            this.stockService.insertStockInvoice(existingVisit.FacturaID, decreases),
                            this.stockService.insertStockHistory(id, decreases)
                        ])
                    }

                    const after = await this.stockService.findInvoiceItems(existingVisit.FacturaID)
                    const subtotal = (items: typeof after) => items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0)
                    const amountDelta = subtotal(after) - subtotal(before)

                    if (amountDelta !== 0) {
                        await this.invoiceService.incrementAmountById(existingVisit.FacturaID, amountDelta)
                    }
                }

                return this.findVisitById(id);
            } catch (err: any) {
                console.log('Error editing visit:', err);
                throw err;
            }
        })
    };

    deleteVisit = async (id: string): Promise<any> => {
        return TenantContext.withLock('clinical_workflows', async () => {
            try {
                const existingVisit = await this.visitsRepo.findById(id)

                const affectedRows = await this.visitsRepo.softDelete(id)
                if (affectedRows == 0)
                    throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`)

                if (existingVisit?.FacturaID) {
                    try {
                        await this.annulInvoiceForVisit(existingVisit.FacturaID)
                    } catch (err) {
                        throw err
                    }
                }

                return `Visit Id: ${id} deleted`
            } catch (err) {
                throw err
            }
        })
    }

    private annulInvoiceForVisit = async (facturaId: string): Promise<void> => {
        const invoice = await this.invoiceService.getInvByFacturaId(facturaId)
        if (!invoice) return

        const status = String(invoice.Estado || '').toLowerCase()
        // Paid invoices are money already collected; never void those silently
        if (status.includes('anul') || status.includes('pag')) return

        await this.invoiceService.annulInvoiceById(invoice.InvoiceNumber)
    }

    getDoctors = async (term: string): Promise<any> => {
        try {
            const resp = await this.visitsRepo.findDoctors(term)
            return {
                doctors: resp.map(x => StaffMapper.toStaffResponse(x))
            }
        } catch (err: any) {
            console.log('error getting doctors :::: ', err.message)
            throw err
        }
    }

    getPatients = async (term: string): Promise<any> => {
        try {
            const resp = await this.visitsRepo.findPatients(term)
            return {
                patients: resp.map(x => PatientMapper.toShortPatientsResponse(x))
            }
        } catch (err: any) {
            console.log('error getting doctors :::: ', err.message)
            throw err
        }
    }

    getStockItems = async (term: string): Promise<any> => {
        try {
            const resp = await this.visitsRepo.findStockItems(term)
            return {
                stock: resp.map(x => StockMapper.toStockResponse(x))
            }
        } catch (err: any) {
            console.log('error getting stock items :::: ', err.message)
            throw err
        }
    }

    private buildValidationError = (messages: string[]) => {
        const err: any = new Error('Validation error')
        err.name = 'validation_errors'
        err.errors = messages.map((msg) => ({ msg }))
        return err
    }

    private assertOrigin(origin?: string): VisitOrigin {
        if (!origin) {
            throw this.buildValidationError(['El origen de la visita es requerido.'])
        }
        const normalized = origin.trim() as VisitOrigin
        if (!VALID_ORIGINS.includes(normalized)) {
            throw this.buildValidationError([`Origen de visita invalido: ${origin}`])
        }
        return normalized
    }

    private async resolveOrigin(body: CreateVisitPayload, id: string): Promise<VisitOrigin> {
        if (body.origin) {
            return this.assertOrigin(body.origin)
        }
        const visit = await this.visitsRepo.findById(id)
        if (!visit) {
            throw this.errorHandler('not_found_error', `No visit found with Id: ${id}`)
        }
        const mapped = VISIT_TYPE_TO_ORIGIN[visit.TipoVisita]
        if (!mapped) {
            throw this.buildValidationError(['No se pudo determinar el origen de la visita.'])
        }
        return mapped
    }

    private validateExpediente(expediente: ExpedientePayload | undefined, origin: VisitOrigin) {
        const errors: string[] = []
        const isBlank = (value: any) => value === undefined || value === null || value === ''

        if (!expediente) {
            errors.push('El expediente es requerido.')
        }

        const standard = expediente?.standard ?? {}
        const module = expediente?.module ?? {}

        const fieldLabels: Record<string, string> = {
            chiefComplaint: 'Motivo de consulta/ingreso',
            currentIllness: 'Padecimiento actual',
            physicalExam: 'Exploracion fisica',
            triageLevel: 'Triage',
            arrivalMode: 'Modo de llegada',
            disposition: 'Destino/condicion al egreso',
            preOpDiagnosis: 'Diagnostico preoperatorio',
            postOpDiagnosis: 'Diagnostico postoperatorio',
            procedure: 'Procedimiento quirurgico',
            anesthesiaType: 'Tipo de anestesia',
            surgeryStart: 'Inicio de cirugia',
            surgeryEnd: 'Fin de cirugia',
            admissionDiagnosis: 'Diagnostico de ingreso',
            admissionReason: 'Motivo de ingreso',
            service: 'Servicio',
            bed: 'Cama',
            evolutionSummary: 'Resumen de evolucion'
        }

        const requiredStandard = ['chiefComplaint', 'currentIllness', 'physicalExam']
        requiredStandard.forEach((field) => {
            if (isBlank((standard as any)[field])) {
                errors.push(`Se requiere ${fieldLabels[field]}`)
            }
        })

        const requiredByOrigin: Record<VisitOrigin, string[]> = {
            visits: [],
            emergency: ['triageLevel', 'arrivalMode', 'disposition'],
            oroom: ['preOpDiagnosis', 'postOpDiagnosis', 'procedure', 'anesthesiaType', 'surgeryStart', 'surgeryEnd'],
            hospitalization: ['admissionDiagnosis', 'admissionReason', 'service', 'bed', 'evolutionSummary']
        }

        requiredByOrigin[origin].forEach((field) => {
            if (isBlank((module as any)[field])) {
                errors.push(`Se requiere ${fieldLabels[field]}`)
            }
        })

        if (errors.length > 0) {
            throw this.buildValidationError(errors)
        }
    }

    private errorHandler = (name: string, msg: string) => {
        const err = new Error()
        err.name = name
        err.message = msg
        return err
    }
}
