import { VisitsRepository } from '../ports/visits.repository'
import { HistoryMapper } from '../../domain/mappers/HistoryMapper'
import { StaffService } from './staff.service'
import { PatientsService } from './patients.service'
import { StockService } from './stock.services'
import { InvoiceService } from './invoice.service'
import { StaffMapper } from '../../domain/mappers/StaffMapper'
import { PatientMapper } from '../../domain/mappers/PatientMapper'
import { StockMapper } from '../../domain/mappers/StockMapper'

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

export class VisitsService {

    private staffService: StaffService
    private stockService: StockService
    private patientService: PatientsService
    private invoiceService: InvoiceService
    private visitsRepo: VisitsRepository

    constructor ( 
        staffService: StaffService, 
        patientService: PatientsService, 
        stockService: StockService,
        invoiceService: InvoiceService,
        visitsRepo: VisitsRepository
    ) {
        this.staffService = staffService
        this.patientService = patientService
        this.stockService = stockService
        this.invoiceService = invoiceService
        this.visitsRepo = visitsRepo
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
            return {
                visit: HistoryMapper.toHistoryFormResponse( medicalHistory ),
                stock
            }
        } catch ( err ) {
            throw err
        }
    }

    createVisit = async (createVisitPayload: CreateVisitPayload): Promise<any> => {
        const { stockItems, date, doctor, patient, origin } = createVisitPayload
        const fieldsForVisit = HistoryMapper.toDbForm(createVisitPayload)
        const translatedFields = this.removeUndefined(fieldsForVisit)

        const validExt: Record<string, string> = {
            visits: 'Consulta' ,
            emergency: 'Emergencia' ,
            hospitalization: 'Hospitalizacion',
            oroom: 'Quirofano'
        }

        translatedFields['isActive'] = true
        translatedFields['TipoVisita'] = validExt[origin]

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
        const fieldsForVisit = HistoryMapper.toDbForm(body)
        const translatedFields = this.removeUndefined(fieldsForVisit)

        try {
            const affectedRows = await this.visitsRepo.update( +id, translatedFields )
            if (affectedRows === 0) {
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`);
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

    private errorHandler = (name:string, msg:string) => {
        const err = new Error()
        err.name = name
        err.message = msg
        return err
    }
}
