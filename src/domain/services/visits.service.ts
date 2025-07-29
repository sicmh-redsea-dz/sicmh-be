import { ResultSetHeader } from 'mysql2'
import { Database } from '../../infrastructure/database/Database'
import { visitsQueries } from '../../infrastructure/database/queries/visits.queries'
import { History, ShortHistory } from '../entities/History'
import { HistoryMapper } from '../mappers/HistoryMapper'
import { FindAllVistiHistories, HistoryResponse } from '../responses/VisitsReponse'
import { StaffService } from './staff.service'
import { PatientsService } from './patients.service'
import { StockService } from './stock.services'
import { InvoiceService } from './invoice.service'

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
}

interface EditVisitPayload {
    id: string,
    body: CreateVisitPayload
}

interface DelimitersArgs {
    limit: number,
    offset: number
    term: string
    def: boolean
}

export class VisitsService {

    private staffService: StaffService
    private stockService: StockService
    private patientService: PatientsService
    private invoiceService: InvoiceService

    constructor ( 
        staffService: StaffService, 
        patientService: PatientsService, 
        stockService: StockService,
        invoiceService: InvoiceService
    ) {
        this.staffService = staffService
        this.patientService = patientService
        this.stockService = stockService
        this.invoiceService = invoiceService
    }

    findAllVisits = async (args: DelimitersArgs):Promise<FindAllVistiHistories> => {
        let visitQ = visitsQueries('all-visits', args)
        try {
            const visitHistory = await Database.execute<ShortHistory[]>(visitQ)
            const totalRecords =  visitHistory.length > 0 ? visitHistory[0].total_registries : 0
            const staff = await this.staffService.getAllDocs()
            const patients = await this.patientService.findAllPatients({limit: 100, offset: 0})
            const stock = await this.stockService.findAll()
            return {
                visits: visitHistory.map( visit => HistoryMapper.toHistoryResponse( visit )),
                staff,
                patients: patients.patients,
                stock,
                totalRecords
            }
        } catch ( err: any) {
            console.log('the err :::: ', err.message)
            throw err
        }
        
    }

    findVisitById = async ( id: number ):Promise<HistoryResponse> => {
        const visitQ = visitsQueries( 'one-visit' )
        try {
            const medicalHistory = await Database.execute<History[]>(visitQ, [ id ])
            return HistoryMapper.toHistoryFormResponse( medicalHistory[0] )
        } catch ( err ) {
            throw err
        }
    }

    createVisit = async (createVisitPayload: CreateVisitPayload): Promise<any> => {
        const { stockItems, date, doctor, patient } = createVisitPayload
        const fieldsForVisit = HistoryMapper.toDbForm(createVisitPayload)
        const translatedFields = this.removeUndefined(fieldsForVisit)

        translatedFields['isActive'] = true
        translatedFields['TipoVisita'] = stockItems ? 'Emergencia' : 'Consulta'

        try {

            let amount: number = 0.00

            if ( stockItems && stockItems.length > 0 )
                amount = await this.stockService.readAmountByStockQty( stockItems )
            
            translatedFields['FacturaID'] = await this.invoiceService.createInvoice({ date, doctor, patient, amount })

            const { query, values } = this.buildInsertQuery('historia_medica', translatedFields)

            const resp = await Database.execute<ResultSetHeader>(query, values)
            const { insertId } = resp

            if ( stockItems && stockItems.length > 0 ) {
                await this.stockService.reduceStockQuantities( stockItems )
                await this.stockService.insertInvoiceStock(translatedFields['FacturaID'], stockItems)
            }

            return {
                visit: insertId
            }
        } catch (err) {
            console.error('error creating visit: ', err)
            throw err
        }
    }

    private buildInsertQuery(table: string, data: Record<string, any>): { query: string; values: any[] } {
        const keys = Object.keys(data)
        const columns = keys.join(', ')
        const placeholders = keys.map(() => '?').join(', ')
        const values = keys.map((key) => data[key])

        const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders});`
        return { query, values }
    }

    private removeUndefined(obj: Record<string, any>): Record<string, any> {
        return Object.fromEntries(
            Object.entries(obj).filter(([_, value]) => value !== undefined)
        );
    }

    editVisit = async( editVisitPayload: EditVisitPayload ): Promise<any> => {
        const {id, body} = editVisitPayload
        const { patient, date, diagnosis, treatment, notes, pressure, oxygenation, temperature, glucometry, weight, height, BMI, fatPercentage, visceralFat, ageAccordingToWeight, doctor, familyHst, backgroundHst, pathologicalHst, surgicalHst } = body
        const visitQ = visitsQueries( 'edit-visit' )
        const values = [patient, date, diagnosis, treatment, notes, pressure, oxygenation, temperature, glucometry, weight, height, BMI, fatPercentage, visceralFat, ageAccordingToWeight, 'Consulta', 5, doctor, , familyHst, backgroundHst, pathologicalHst, surgicalHst, +id]
        try {
            const updatedVisit = await Database.execute<ResultSetHeader>(visitQ, values)
            const { affectedRows } = updatedVisit

            if ( affectedRows === 0)
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`)

            return this.findVisitById( +id )
        } catch ( err: any ) {
            console.log(' error editing visit: ', err.message)
            throw err
        }
    }

    deleteVisit = async ( id: number ): Promise<any> => {
        const visitQ = visitsQueries( 'delete-visit' )
        try {
            const deletedVisit = await Database.execute<ResultSetHeader>(visitQ, [ id ])
            const { affectedRows } = deletedVisit

            if ( affectedRows == 0 )
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`)

            return `Visit Id: ${id} deleted`
        } catch ( err ) {
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