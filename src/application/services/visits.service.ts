import { VisitsRepository } from '../ports/visits.repository'
import { HistoryMapper } from '../../domain/mappers/HistoryMapper'
import { StaffService } from './staff.service'
import { PatientsService } from './patients.service'
import { StockService } from './stock.services'
import { InvoiceService } from './invoice.service'
import { StaffMapper } from '../../domain/mappers/StaffMapper'
import { PatientMapper } from '../../domain/mappers/PatientMapper'
import { StockMapper } from '../../domain/mappers/StockMapper'
import { ExpedientePayload, ExpedienteExtra, VisitOrigin } from '../../domain/entities/Expediente'
import { ExpedienteRepository } from '../ports/expediente.repository'

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
    stockItems?:            { id: number; qty: number; }[]
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
    private visitsRepo: VisitsRepository
    private expedienteRepo: ExpedienteRepository

    constructor ( 
        staffService: StaffService, 
        patientService: PatientsService, 
        stockService: StockService,
        invoiceService: InvoiceService,
        visitsRepo: VisitsRepository,
        expedienteRepo: ExpedienteRepository
    ) {
        this.staffService = staffService
        this.patientService = patientService
        this.stockService = stockService
        this.invoiceService = invoiceService
        this.visitsRepo = visitsRepo
        this.expedienteRepo = expedienteRepo
    }

    findAllVisits = async (args: DelimitersArgs):Promise<any> => {
        try {
            const visitHistory = await this.visitsRepo.findAll( args )
            const totalRecords =  visitHistory.length > 0 ? visitHistory[0].total_registries : 0
            const staff = await this.staffService.getAllDocs()
            const patients = await this.patientService.findAllPatients({limit: 100, offset: 0})
            
            return {
                visits: visitHistory.map( visit => HistoryMapper.toHistoryResponse( visit )),
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
            const expedientePayload = expediente ? { standard: expediente.standard, module: expediente.module } : null
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

    createVisit = async (createVisitPayload: CreateVisitPayload): Promise<any> => {
        const { stockItems, date, doctor, patient, origin, expediente } = createVisitPayload
        const originKey = this.assertOrigin(origin)
        this.validateExpediente(expediente, originKey)

        const fieldsForVisit = HistoryMapper.toDbForm(createVisitPayload)
        const translatedFields = this.removeUndefined(fieldsForVisit)

        translatedFields['isActive'] = true
        translatedFields['TipoVisita'] = ORIGIN_TO_VISIT_TYPE[originKey]

        try {

            let amount: number = 0.00

            if ( stockItems && stockItems.length > 0 )
                amount = await this.stockService.readAmountByStockQty( stockItems )
            
            translatedFields['FacturaID'] = await this.invoiceService.createInvoice({ date, doctor, patient, amount })

            const insertId = await this.visitsRepo.create( translatedFields )

            if ( stockItems && stockItems.length > 0 ) {
                await this.stockService.reduceStockQuantities( stockItems )
                await this.stockService.insertStockInvoice(translatedFields['FacturaID'], stockItems)
                await this.stockService.insertStockHistory( insertId, stockItems )
            }

            if ( expediente ) {
                const now = new Date().toISOString()
                const expedienteRecord: ExpedienteExtra = {
                    historyId: insertId,
                    patientId: patient,
                    origin: originKey,
                    standard: expediente.standard,
                    module: expediente.module,
                    createdAt: now,
                    updatedAt: now
                }
                await this.expedienteRepo.upsert(insertId, expedienteRecord)
            }

            return {
                visit: insertId
            }
        } catch (err) {
            console.error('error creating visit: ', err)
            throw err
        }
    }

    private removeUndefined(obj: Record<string, any>): Record<string, any> {
        return Object.fromEntries(
            Object.entries(obj).filter(([_, value]) => value !== undefined)
        );
    }


   editVisit = async (editVisitPayload: EditVisitPayload): Promise<any> => {
        const { id, body } = editVisitPayload;
        const originKey = await this.resolveOrigin(body, +id)
        this.validateExpediente(body.expediente, originKey)

        const fieldsForVisit = HistoryMapper.toDbForm(body)
        const translatedFields = this.removeUndefined(fieldsForVisit)

        try {
            const affectedRows = await this.visitsRepo.update( +id, translatedFields )
            if (affectedRows === 0) {
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`);
            }

            if ( body.expediente ) {
                const existingExpediente = await this.expedienteRepo.findByHistoryId(+id)
                const now = new Date().toISOString()
                const expedienteRecord: ExpedienteExtra = {
                    historyId: +id,
                    patientId: body.patient ?? existingExpediente?.patientId,
                    origin: originKey,
                    standard: body.expediente.standard,
                    module: body.expediente.module,
                    createdAt: existingExpediente?.createdAt ?? now,
                    updatedAt: now
                }
                await this.expedienteRepo.upsert(+id, expedienteRecord)
            }

            return this.findVisitById(+id);
        } catch (err: any) {
            console.log('Error editing visit:', err);
            throw err;
        }
    };

    deleteVisit = async ( id: number ): Promise<any> => {
        try {
            const affectedRows = await this.visitsRepo.softDelete( id )
            if ( affectedRows == 0 )
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`)

            return `Visit Id: ${id} deleted`
        } catch ( err ) {
            throw err
        }
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

    private errorHandler = (name:string, msg:string) => {
        const err = new Error()
        err.name = name
        err.message = msg
        return err
    }
}
