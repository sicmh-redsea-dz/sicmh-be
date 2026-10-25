import { ExpedienteInput, normalizeExpediente, visitDate } from './visit-input'
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
import { ExpedienteExtra, VisitOrigin } from '../../domain/entities/Expediente'
import { ExpedienteRepository } from '../ports/expediente.repository'
import { TenantContext } from '../../infrastructure/database/TenantContext'
import { ClinicalProfileReview, validateClinicalProfileReview } from '../../domain/entities/ClinicalProfile'
import { ClinicalProfileService } from './clinical-profile.service'

interface CreateVisitPayload {
    clinicalProfileReview?: ClinicalProfileReview
    BMI?:                    number
    ageAccordingToWeight?:   number
    date?:                   string
    diagnosis?:              string
    doctor:                 string
    fatPercentage?:          number
    glucometry?:             number
    height?:                 number
    notes?:                  string
    oxygenation?:            number
    patient:                string
    pressure?:               string
    temperature?:            number
    treatment?:              string
    visceralFat?:            number
    weight?:                 number
    familyHst?:              string
    backgroundHst?:          string
    pathologicalHst?:        string
    surgicalHst?:            string
    stockItems?:            { id: string; qty: number; subinventoryId?: string }[]
    origin:                 string
    expediente?:            ExpedienteInput | null
}

interface EditVisitPayload {
    id: string,
    body: Partial<CreateVisitPayload>
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

    findVisitById = async ( id: string ):Promise<any> => {
        try {
            const medicalHistory = await this.visitsRepo.findById( id )
            if ( !medicalHistory )
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}`)
            const stock: never[] = [] // Catalogs are loaded separately through location-scoped routes.
            const expediente = await this.expedienteRepo.findByHistoryId(id)
            const expedientePayload = expediente ? { standard: expediente.standard, module: expediente.module } : null
            return {
                visit: {
                    ...HistoryMapper.toHistoryFormResponse( medicalHistory ),
                    expediente: expedientePayload,
                    clinicalProfileSnapshot: await new ClinicalProfileService().snapshot(id)
                },
                stock
            }
        } catch ( err ) {
            throw err
        }
    }

    createVisit = async (createVisitPayload: CreateVisitPayload, actorId?: string): Promise<any> => {
        const profileReview = createVisitPayload.clinicalProfileReview === undefined ? undefined
            : validateClinicalProfileReview(createVisitPayload.clinicalProfileReview)
        if (profileReview && createVisitPayload.origin !== 'visits') throw this.buildValidationError(['La ficha clinica se revisa desde consulta externa.'])
        if (profileReview) {
            const { familyHst, backgroundHst, pathologicalHst, surgicalHst, allergies, currentMeds } = profileReview.data
            createVisitPayload = { ...createVisitPayload, familyHst, backgroundHst, pathologicalHst, surgicalHst,
                expediente: { ...createVisitPayload.expediente, standard: { ...createVisitPayload.expediente?.standard, allergies, currentMeds } } }
        }
        const date = visitDate(createVisitPayload.date)
        const { doctor, patient, origin } = createVisitPayload
        const location = ({ visits: 'main', emergency: 'emergency', hospitalization: 'hospitalization', oroom: 'operating_room' } as Record<string, string>)[origin]
        const stockItems = createVisitPayload.stockItems?.map(item => ({ ...item, subinventoryId: location }))
        this.computeStockDelta([], stockItems ?? [], location)
        const expediente = normalizeExpediente(createVisitPayload.expediente)
        const originKey = this.assertOrigin(origin)

        const fieldsForVisit = HistoryMapper.toDbForm({ ...createVisitPayload, date })
        const translatedFields = this.removeUndefined(fieldsForVisit)

        translatedFields['isActive'] = true
        translatedFields['TipoVisita'] = ORIGIN_TO_VISIT_TYPE[originKey]

        // Resolve the default consulta service BEFORE creating the invoice so its
        // price is part of the initial Monto instead of a follow-up UPDATE that
        // could silently fail and leave the invoice at 0.00
        let consultaService: { id: string; name: string; price: number } | null = null

        let invoice: { id: string; invoiceNumber: string }
        let insertId: string

        try {
            // Invoice + visit + stock reduction + stock inserts all run on one
            // connection: if any step fails (e.g. insufficient stock), the whole
            // set rolls back atomically instead of leaving partial writes behind.
            const result = await TenantContext.transaction(async () => {
                let amount: number = 0.00

                if ( stockItems && stockItems.length > 0 )
                    amount = await this.stockService.readAmountByStockQty( stockItems )

                if (originKey === 'visits') {
                    consultaService = await this.billingService.getDefaultConsultaService()
                    if (!consultaService) throw this.buildValidationError(['Configure el servicio de consulta antes de registrar una consulta externa.'])
                    if (consultaService) {
                        amount += consultaService.price
                    }
                }

                const createdInvoice: { id: string; invoiceNumber: string } = await this.invoiceService.createInvoice({ date, doctor, patient, amount })
                translatedFields['FacturaID'] = createdInvoice.id

                const visitId = await this.visitsRepo.create( translatedFields )
                if (profileReview) await new ClinicalProfileService().review(patient, visitId, profileReview, actorId ?? '')

                if ( stockItems && stockItems.length > 0 ) {
                    await this.stockService.reduceStockQuantities( stockItems )
                    await Promise.all([
                        this.stockService.insertStockInvoice(translatedFields['FacturaID'], stockItems),
                        this.stockService.insertStockHistory( visitId, stockItems )
                    ])
                }

                if (expediente) {
                    const now = new Date().toISOString()
                    await this.expedienteRepo.upsert(visitId, {
                        ...expediente, historyId: visitId, patientId: patient, origin: originKey,
                        createdAt: now, updatedAt: now,
                    })
                }
                return { invoice: createdInvoice, insertId: visitId }
            })

            invoice = result.invoice
            insertId = result.insertId
        } catch (err) {
            console.error('error creating visit, transaction rolled back: ', err)
            throw err
        }

        // Encounter/movement/ledger failures are only warned, never surfaced
        // to the client, so there is no reason to make the response wait for
        // them (they rewrite growing JSON files on every save).
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
        patient: string
        doctor: string
        originKey: VisitOrigin
        invoice: { id: string; invoiceNumber: string }
        visitId: string
        date: string
        consultaService: { id: string; name: string; price: number } | null
    }): Promise<void> => {
        const { patient, doctor, originKey, invoice, visitId, date, consultaService } = args

        let billingPatientName = ''
        let billingEncounterId: string | undefined

        try {
            const patientInfo = await this.patientService.findOnePatient(String(patient))
            billingPatientName = `${patientInfo.name} ${patientInfo.lastName}`.trim()
            const encounter = await this.billingService.registerEncounterForInvoice({
                patientId: patient,
                patientName: billingPatientName,
                doctorId: doctor || undefined,
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
        previous: { stockId: string; stockQty: number }[],
        incoming: { id: string; qty: number; subinventoryId?: string }[],
        location = 'main'
    ) {
        const prevMap = new Map<string, number>()
        previous.forEach((item) => {
            const qty = Number(item.stockQty) || 0
            prevMap.set(item.stockId, qty)
        })

        const incomingIds = new Set(incoming.map((item) => item.id))
        if (incomingIds.size !== incoming.length || incoming.some(item => !item.id || !Number.isSafeInteger(Number(item.qty)) || Number(item.qty) < 0)) {
            throw this.buildValidationError(['Los insumos deben tener identificadores unicos y cantidades enteras no negativas.'])
        }
        const deltaItems: { id: string; qty: number; subinventoryId?: string }[] = []

        incoming.forEach((item) => {
            const nextQty = Number(item.qty) || 0
            const prevQty = prevMap.get(item.id) ?? 0
            const delta = nextQty - prevQty
            if (delta !== 0) {
                deltaItems.push({ id: item.id, qty: delta, subinventoryId: location })
            }
        })

        previous.forEach((item) => {
            if (incomingIds.has(item.stockId)) return
            const prevQty = Number(item.stockQty) || 0
            if (prevQty > 0) {
                deltaItems.push({ id: item.stockId, qty: -prevQty, subinventoryId: location })
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
        return TenantContext.transaction(async () => {
        const { id, body } = editVisitPayload;
        if (body.clinicalProfileReview !== undefined) throw this.buildValidationError(['La ficha vigente se revisa en una consulta nueva; esta atencion conserva su ficha original.'])

        const existingVisit = await this.visitsRepo.findById(id, true)
        if (!existingVisit) {
            throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`);
        }

        const reviewedProfile = await new ClinicalProfileService().snapshot(id)
        if (reviewedProfile) {
            if (body.patient && body.patient !== existingVisit.PacienteID) throw this.buildValidationError(['No se puede cambiar el paciente de una atencion con ficha revisada.'])
            const { familyHst, backgroundHst, pathologicalHst, surgicalHst, allergies, currentMeds } = reviewedProfile.data
            Object.assign(body, { familyHst, backgroundHst, pathologicalHst, surgicalHst })
            if (body.expediente) body.expediente = { ...body.expediente, standard: { ...body.expediente.standard, allergies, currentMeds } }
        }

        const originKey = body.origin ? this.assertOrigin(body.origin) : VISIT_TYPE_TO_ORIGIN[existingVisit.TipoVisita]
        if (!originKey) throw this.buildValidationError(['No se pudo determinar el modulo de la atencion.'])
        const existingInventory = HistoryMapper.toHistoryFormResponse(existingVisit).usedInventory ?? []
        const stockDelta = Array.isArray(body.stockItems)
            ? this.computeStockDelta(existingInventory, body.stockItems,
                ({ Consulta: 'main', Emergencia: 'emergency', Hospitalizacion: 'hospitalization', Quirofano: 'operating_room' } as Record<string, string>)[existingVisit.TipoVisita]) : []
        if (stockDelta.length) {
            const invoice = await this.invoiceService.getInvByFacturaId(existingVisit.FacturaID, true)
            if (!invoice || String(invoice.Estado).toLowerCase() !== 'pendiente')
                throw this.buildValidationError(['No se puede modificar inventario de una factura pagada o anulada.'])
        }
        const existingExpediente = body.expediente == null ? null : await this.expedienteRepo.findByHistoryId(id)
        const expediente = normalizeExpediente(body.expediente, existingExpediente)

        const fieldsForVisit = HistoryMapper.toDbForm({ ...body, visitType: undefined, invoiceId: undefined })
        const translatedFields = this.removeUndefined(fieldsForVisit)

        try {
            const affectedRows = await this.visitsRepo.update(id, translatedFields)
            if (affectedRows === 0) {
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`);
            }

            if ( expediente ) {
                const now = new Date().toISOString()
                const expedienteRecord: ExpedienteExtra = {
                    historyId: id,
                    patientId: body.patient ?? existingExpediente?.patientId,
                    origin: originKey,
                    standard: expediente.standard,
                    module: expediente.module,
                    createdAt: existingExpediente?.createdAt ?? now,
                    updatedAt: now
                }
                await this.expedienteRepo.upsert(id, expedienteRecord)
            }

            if (stockDelta.length > 0) {
                const increases = stockDelta.filter((item) => item.qty > 0)
                const decreases = stockDelta.filter((item) => item.qty < 0)

                if (increases.length > 0) {
                    await this.stockService.reduceStockQuantities(increases)
                    await Promise.all([
                        this.stockService.insertStockInvoice(existingVisit.FacturaID, increases),
                        this.stockService.insertStockHistory(id, increases)
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
                        this.stockService.insertStockHistory(id, decreases)
                    ])
                }

                const amountDelta = await this.stockService.readAmountByStockQty(
                    stockDelta.map((item) => ({ id: item.id, qty: item.qty }))
                )

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

    deleteVisit = async ( id: string ): Promise<any> => {
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

    private annulInvoiceForVisit = async ( facturaId: string ): Promise<void> => {
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

    getStockItems = async ( term: string ): Promise<any> => {
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

    private async resolveOrigin(body: Partial<CreateVisitPayload>, id: string): Promise<VisitOrigin> {
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
