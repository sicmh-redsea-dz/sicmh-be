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
import { StaffMapper } from '../mappers/StaffMapper'
import { Staff } from '../entities/Staff'
import { Patient, ShortPatient } from '../entities/Patient'
import { PatientMapper } from '../mappers/PatientMapper'
import { StockMapper } from '../mappers/StockMapper'

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

    findAllVisits = async (args: DelimitersArgs):Promise<any> => {
        let visitQ = visitsQueries('all-visits', args)
        try {
            const visitHistory = await Database.execute<ShortHistory[]>(visitQ)
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
        const visitQ = visitsQueries( 'one-visit' )
        try {
            const medicalHistory = await Database.execute<History[]>(visitQ, [ id ])
            const stock = await this.stockService.findAll()
            return {
                visit: HistoryMapper.toHistoryFormResponse( medicalHistory[0] ),
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

            const { query, values } = this.buildInsertQuery('historia_medica', translatedFields)

            const resp = await Database.execute<ResultSetHeader>(query, values)
            const { insertId } = resp

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

    private generateUpdateQuery( tableName: string, data: Record<string, any>, idField: string = 'HistoriaID' ){
    
        if (!data[idField]) {
            throw new Error(`El campo ${idField} es requerido para la actualización`);
        }

        const fieldsToUpdate = Object.keys(data).filter(key => key !== idField);

        if (fieldsToUpdate.length === 0) {
            throw new Error('No hay campos válidos para actualizar');
        }

        const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');

        const values = fieldsToUpdate.map(field => data[field]);
        
        values.push(data[idField]);

        const query = `update ${tableName} set ${setClause} where ${idField} = ?;`;

        return { query, values };
    }


   editVisit = async (editVisitPayload: EditVisitPayload): Promise<any> => {
        const { id, body } = editVisitPayload;
        const fieldsForVisit = HistoryMapper.toDbForm(body)
        const translatedFields = this.removeUndefined(fieldsForVisit)
        
        translatedFields.HistoriaID = id;

        try {
            const { query, values } = this.generateUpdateQuery('historia_medica', translatedFields)
            const updatedVisit = await Database.execute<ResultSetHeader>(query, values);
            const { affectedRows } = updatedVisit;

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

    getDoctors = async ( term: string ): Promise<any> => {
        
        const visitQ = visitsQueries( 'get-doctor', { term } )

        try {
            const resp = await Database.execute<Staff[]>( visitQ )
            return {
                doctors: resp.map( x => StaffMapper.toStaffResponse( x ))
            }
        } catch ( err: any ) {
            console.log('error getting doctors :::: ', err.message)
            throw err
        }
    }

    getPatients = async ( term: string ): Promise<any> => {
        
        const visitQ = visitsQueries( 'get-patients', { term } )

        try {
            const resp = await Database.execute<ShortPatient[]>( visitQ )
            return {
                patients: resp.map( x => PatientMapper.toShortPatientsResponse( x ))
            }
        } catch ( err: any ) {
            console.log('error getting doctors :::: ', err.message)
            throw err
        }
    }

    getStockItems = async ( term: number ): Promise<any> => {
        
        const visitQ = visitsQueries( 'get-stock-items' )

        try {
            const resp = await Database.execute<any[]>( visitQ, [ term ])
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