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
import { ExpedientePayload, VisitOrigin } from '../../domain/entities/Expediente'
import { ExpedienteRepository } from '../ports/expediente.repository'
import { Database } from '../../infrastructure/database/Database'
import { PoolManager } from '../../infrastructure/database/PoolManager'
import { config } from '../../config/env'

interface CreateVisitPayload {
    BMI:                    number
    ageAccordingToWeight:   number
    date:                   string
    diagnosis:              string
    doctor:                 string
    fatPercentage:          number
    glucometry:             number
    height:                 number
    notes:                  string
    oxygenation:            number
    patient:                number
    pressure:               string
    temperature:            number
    treatment:              string
    visceralFat:            number
    weight:                 number
    familyHst:              string
    backgroundHst:          string
    pathologicalHst:        string
    surgicalHst:            string
    stockItems?:            { id: number; qty: number; subinventoryId?: number }[]
    origin:                 string
    expediente?:            ExpedientePayload
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

    constructor ( 
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

    findAllVisits = async (args: DelimitersArgs):Promise<any> => {
        try {
            const originKey = this.parseOriginForList(args.ext)
            const targetStation = originKey ? this.mapOriginToStation(originKey) : null

            // These four are independent of each other, so fetch them concurrently
            // instead of serializing four separate round-trips.
            const [movementMap, visitHistory, staff, patients] = await Promise.all([
                this.billingService.getMovementTrailsByInvoice(),
                // Station filtering (emergency/hospitalization/oroom) happens below against
                // movement-trail data from the JSON movements store, which can't be pushed
                // into this SQL query — so this fetches all active visits (capped at 5000
                // as a safety net, see visits.queries.ts) rather than a true DB-level page.
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
        } catch ( err: any) {
            console.log('the err :::: ', err.message)
            throw err
        }
        
    }

    findVisitById = async ( id: number ):Promise<any> => {
        try {
            const medicalHistory = await this.visitsRepo.findById( id )
            if ( !medicalHistory )
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}`)
            const stock = await this.stockService.findAll()
            const expediente = await this.expedienteRepo.findByHistoryId(id)
            const filePayload = expediente
                ? { standard: expediente.standard, module: expediente.module }
                : null
            const expedientePayload = HistoryMapper.toExpedientePayload(medicalHistory, filePayload)
            return {
                visit: {
                    ...HistoryMapper.toHistoryFormResponse( medicalHistory ),
                    expediente: expedientePayload
                },
                stock
            }
        } catch ( err ) {
            throw err
        }
    }

    getPrescriptionContext = async (id: number, tenantCode: string): Promise<any> => {
        const [prescription, company] = await Promise.all([
            this.visitsRepo.findPrescriptionContext(id),
            PoolManager.resolveEmpresa(tenantCode)
        ])
        if (!prescription) {
            throw this.errorHandler('not_found_error', `No visit found with Id: ${id}`)
        }
        const publicBase = `https://storage.googleapis.com/${config.GCS_PUBLIC_BUCKET}`
        const doctorAssetBase = prescription.doctorUserId
            ? `${publicBase}/${tenantCode}/users/${prescription.doctorUserId}`
            : null
        return {
            ...prescription,
            clinicName: company.NombreEmpresa,
            logoUrl: `${publicBase}/${tenantCode}/logo.png`,
            signatureUrl: doctorAssetBase ? `${doctorAssetBase}/signature.png` : null,
            stampUrl: doctorAssetBase ? `${doctorAssetBase}/stamp.png` : null
        }
    }

    createVisit = async (createVisitPayload: CreateVisitPayload): Promise<any> => {
        const date = createVisitPayload.date?.trim() || new Date().toISOString()
        const normalizedPayload = { ...createVisitPayload, date }
        const { stockItems, doctor, patient, origin } = normalizedPayload
        const originKey = this.assertOrigin(origin)

        const fieldsForVisit = HistoryMapper.toDbForm(normalizedPayload)
        const translatedFields = this.removeUndefined(fieldsForVisit)

        translatedFields['isActive'] = true
        translatedFields['TipoVisita'] = ORIGIN_TO_VISIT_TYPE[originKey]

        // Resolve the default consulta service BEFORE creating the invoice so its
        // price is part of the initial Monto instead of a follow-up UPDATE that
        // could silently fail and leave the invoice at 0.00
        let consultaService: { id: number; name: string; price: number } | null = null

        let invoice: { id: number; invoiceNumber: string }
        let insertId: number

        try {
            // Invoice + visit + stock reduction + stock inserts all run on one
            // connection: if any step fails (e.g. insufficient stock), the whole
            // set rolls back atomically instead of leaving partial writes behind.
            const result = await Database.transaction(async () => {
                let amount: number = 0.00

                if ( stockItems && stockItems.length > 0 )
                    amount = Number(await this.stockService.readAmountByStockQty( stockItems )) || 0

                if (originKey === 'visits') {
                    consultaService = await this.billingService.getDefaultConsultaService()
                    if (!consultaService) {
                        throw this.buildValidationError([
                            'No hay un servicio de consulta configurado para generar la factura.'
                        ])
                    }
                    amount += consultaService.price
                }

                const createdInvoice: { id: number; invoiceNumber: string } = await this.invoiceService.createInvoice({ date, doctor, patient, amount })
                translatedFields['FacturaID'] = createdInvoice.id

                const visitId = await this.visitsRepo.create( translatedFields )

                if ( stockItems && stockItems.length > 0 ) {
                    await this.stockService.reduceStockQuantities( stockItems )
                    await Promise.all([
                        this.stockService.insertStockInvoice(translatedFields['FacturaID'], stockItems),
                        this.stockService.insertStockHistory( visitId, stockItems )
                    ])
                }

                return { invoice: createdInvoice, insertId: visitId }
            })

            invoice = result.invoice
            insertId = result.insertId
        } catch (err) {
            console.error('error creating visit, transaction rolled back: ', err)
            throw err
        }

        // The invoice grid reads facturas.Monto, while the invoice drawer and
        // delivery document read the billing ledger.  Wait for the ledger
        // trail before returning so a newly-created consultation cannot show
        // its service in the grid but be missing from its detail/PDF snapshot.
        // recordBillingTrail keeps its best-effort error handling internally,
        // so a non-essential trail failure still does not fail the visit.
        await this.recordBillingTrail({
            patient,
            doctor,
            originKey,
            invoice,
            visitId: insertId,
            date,
            consultaService
        })

        return { visit: insertId }
    }

    private recordBillingTrail = async (args: {
        patient: number
        doctor: string
        originKey: VisitOrigin
        invoice: { id: number; invoiceNumber: string }
        visitId: number
        date: string
        consultaService: { id: number; name: string; price: number } | null
    }): Promise<void> => {
        const { patient, doctor, originKey, invoice, visitId, date, consultaService } = args

        let billingPatientName = ''
        let billingEncounterId: string | undefined

        try {
            const patientInfo = await this.patientService.findOnePatient(patient)
            billingPatientName = `${patientInfo.name} ${patientInfo.lastName}`.trim()
            const encounter = await this.billingService.registerEncounterForInvoice({
                patientId: patient,
                patientName: billingPatientName,
                doctorId: Number(doctor) || undefined,
                origin: this.mapOriginToStation(originKey),
                invoiceNumber: invoice.invoiceNumber,
                invoiceId: invoice.id,
                createdAt: date
            })
            billingEncounterId = encounter.id
            await this.billingService.createMovement({
                patientId: patient,
                patientName: billingPatientName,
                encounterId: billingEncounterId,
                toStation: this.mapOriginToStation(originKey),
                occurredAt: date,
                source: 'visit',
                reference: { visitId }
            })
        } catch (err) {
            console.warn('billing movement error:', (err as any)?.message || err)
        }

        if (consultaService) {
            try {
                await this.billingService.addConsultaServiceLedgerItem({
                    invoiceNumber: invoice.invoiceNumber,
                    patientId: patient,
                    patientName: billingPatientName,
                    encounterId: billingEncounterId,
                    occurredAt: date,
                    service: consultaService
                })
            } catch (err) {
                console.warn('consulta service ledger error:', (err as any)?.message || err)
            }
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
        previous: { stockId: number; stockQty: number }[],
        incoming: { id: number; qty: number; subinventoryId?: number }[]
    ) {
        const prevMap = new Map<number, number>()
        previous.forEach((item) => {
            const qty = Number(item.stockQty) || 0
            prevMap.set(item.stockId, qty)
        })

        const incomingIds = new Set(incoming.map((item) => item.id))
        const deltaItems: { id: number; qty: number; subinventoryId?: number }[] = []

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
        const { id, body } = editVisitPayload;
        const originKey = await this.resolveOrigin(body, +id)

        const existingVisit = await this.visitsRepo.findById(+id)
        if (!existingVisit) {
            throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`);
        }

        const existingInventory = HistoryMapper.toHistoryFormResponse(existingVisit).usedInventory ?? []
        const incomingInventory = Array.isArray(body.stockItems) ? body.stockItems : []
        const stockDelta = this.computeStockDelta(existingInventory, incomingInventory)

        const date = body.date?.trim()
            || existingVisit.FechaUltimaVisita?.toString()
            || existingVisit.FechaVisita?.toString()
            || new Date().toISOString()
        const fieldsForVisit = HistoryMapper.toDbForm({ ...body, date })
        const translatedFields = this.removeUndefined(fieldsForVisit)

        try {
            const affectedRows = await this.visitsRepo.update( +id, translatedFields )
            if (affectedRows === 0) {
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`);
            }

            if (stockDelta.length > 0) {
                const increases = stockDelta.filter((item) => item.qty > 0)
                const decreases = stockDelta.filter((item) => item.qty < 0)

                if (increases.length > 0) {
                    await this.stockService.reduceStockQuantities(increases)
                    await Promise.all([
                        this.stockService.insertStockInvoice(existingVisit.FacturaID, increases),
                        this.stockService.insertStockHistory(+id, increases)
                    ])
                }

                if (decreases.length > 0) {
                    const restorations = decreases.map((item) => ({ ...item, qty: -item.qty }))
                    await this.stockService.restoreStockQuantities(restorations)
                    // Negative-quantity correction rows: the aggregate SUM() reads
                    // in the stock/invoice history queries net these against the
                    // original charge instead of needing an UPDATE/DELETE.
                    await Promise.all([
                        this.stockService.insertStockInvoice(existingVisit.FacturaID, decreases),
                        this.stockService.insertStockHistory(+id, decreases)
                    ])
                }

                const amountDelta = await this.stockService.readAmountByStockQty(
                    stockDelta.map((item) => ({ id: item.id, qty: item.qty }))
                )

                if (amountDelta !== 0) {
                    await this.invoiceService.incrementAmountById(existingVisit.FacturaID, amountDelta)
                }
            }

            return this.findVisitById(+id);
        } catch (err: any) {
            console.log('Error editing visit:', err);
            throw err;
        }
    };

    deleteVisit = async ( id: number ): Promise<any> => {
        try {
            const existingVisit = await this.visitsRepo.findById( id )

            const affectedRows = await this.visitsRepo.softDelete( id )
            if ( affectedRows == 0 )
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`)

            if ( existingVisit?.FacturaID ) {
                try {
                    await this.annulInvoiceForVisit( existingVisit.FacturaID )
                } catch (err) {
                    console.warn('invoice annul on visit delete warning:', (err as any)?.message || err)
                }
            }

            return `Visit Id: ${id} deleted`
        } catch ( err ) {
            throw err
        }
    }

    private annulInvoiceForVisit = async ( facturaId: number ): Promise<void> => {
        const invoice = await this.invoiceService.getInvByFacturaId( facturaId )
        if ( !invoice ) return

        const status = String(invoice.Estado || '').toLowerCase()
        // Paid invoices are money already collected; never void those silently
        if ( status.includes('anul') || status.includes('pag') ) return

        await this.invoiceService.annulInvoiceById( invoice.InvoiceNumber )
    }

    getDoctors = async ( term: string ): Promise<any> => {
        try {
            const resp = await this.visitsRepo.findDoctors( term )
            return {
                doctors: resp.map( x => StaffMapper.toStaffResponse( x ))
            }
        } catch ( err: any ) {
            console.log('error getting doctors :::: ', err.message)
            throw err
        }
    }

    getPatients = async ( term: string ): Promise<any> => {
        try {
            const resp = await this.visitsRepo.findPatients( term )
            return {
                patients: resp.map( x => PatientMapper.toShortPatientsResponse( x ))
            }
        } catch ( err: any ) {
            console.log('error getting doctors :::: ', err.message)
            throw err
        }
    }

    getStockItems = async ( term: number ): Promise<any> => {
        try {
            const resp = await this.visitsRepo.findStockItems( term )
            return {
                stock: resp.map( x => StockMapper.toStockResponse( x ))
            }
        } catch ( err: any ) {
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

    private async resolveOrigin(body: CreateVisitPayload, id: number): Promise<VisitOrigin> {
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

    private errorHandler = (name:string, msg:string) => {
        const err = new Error()
        err.name = name
        err.message = msg
        return err
    }
}
