import { ResultSetHeader } from 'mysql2'
import { Database } from '../../infrastructure/database/Database'
import { visitsQueries } from '../../infrastructure/database/queries/visits.queries'
import { History, ShortHistory } from '../entities/History'
import { HistoryMapper } from '../mappers/HistoryMapper'
import { FindAllVistiHistories, HistoryResponse } from '../responses/VisitsReponse'
import { StaffService } from './staff.service'
import { PatientsService } from './patients.service'
import { StockService } from './stock.services'

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
}

interface EditVisitPayload {
    id: string,
    body: CreateVisitPayload
}

export class VisitsService {

    private staffService: StaffService
    private stockService: StockService
    private patientService: PatientsService

    constructor ( staffService: StaffService, patientService: PatientsService, stockService: StockService ) {
        this.staffService = staffService
        this.patientService = patientService
        this.stockService = stockService
    }

    findAllVisits = async ():Promise<FindAllVistiHistories> => {
        let visitQ = visitsQueries('all-visits')
        try {
            const visitHistory = await Database.execute<ShortHistory[]>(visitQ)
            const totalRecords = visitHistory[0].total_registries
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
        } catch ( err ) {
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
        const { patient, date, diagnosis, treatment, notes, pressure, oxygenation, temperature, glucometry, weight, height, BMI, fatPercentage, visceralFat, ageAccordingToWeight, doctor } = createVisitPayload
        
        const visitQ = visitsQueries( 'create-visit' )
        const values = [patient, date, diagnosis, treatment, notes, pressure, oxygenation, temperature, glucometry, weight, height, BMI, fatPercentage, visceralFat, ageAccordingToWeight, date, true, 'Consulta', 5, doctor]
        try {
            const resp = await Database.execute<ResultSetHeader>(visitQ, values)
            const { insertId } = resp
            return {
                visit: insertId
            }
        } catch ( err ) {
            console.error('error creating visit: ', err)
            throw err
        }
    }

    editVisit = async( editVisitPayload: EditVisitPayload ): Promise<any> => {
        const {id, body} = editVisitPayload
        const { patient, date, diagnosis, treatment, notes, pressure, oxygenation, temperature, glucometry, weight, height, BMI, fatPercentage, visceralFat, ageAccordingToWeight, doctor } = body
        const visitQ = visitsQueries( 'edit-visit' )
        const values = [patient, date, diagnosis, treatment, notes, pressure, oxygenation, temperature, glucometry, weight, height, BMI, fatPercentage, visceralFat, ageAccordingToWeight, 'Consulta', 5, doctor, +id]
        try {
            const updatedVisit = await Database.execute<ResultSetHeader>(visitQ, values)
            const { affectedRows } = updatedVisit

            if ( affectedRows === 0)
                throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`)

            return this.findVisitById( +id )
        } catch ( err ) {
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