import { ResultSetHeader } from 'mysql2';
import { Database } from '../../infrastructure/database/Database';
import { patientQueries } from '../../infrastructure/database/queries/patients.queries'
import { Patient } from '../entities/Patient';
import { PatientMapper } from '../mappers/PatientMapper';
import { PatientResponse } from '../responses/PatientResponse';

interface Pagination {
    limit: number,
    offset: number
}

interface findAllPatientsResponse {
    patients: PatientResponse[],
    totalRegistries: number
}

interface IncomingPatientParams {
    birthdate:string
    firstName:string
    lastName:string
    idNumber?:string
    address:string
    gender:string
    phone:string
    email:string
}

export class PatientsService {
    static findAllPatients = async (pagination: Pagination):Promise<findAllPatientsResponse> => {
        let patientsQ = patientQueries('read', pagination)
        try {
            const patients = await Database.execute<Patient[]>(patientsQ);
            const totalRegistries = patients[0].total_registries
            const mappedPatients = patients.map(patient => PatientMapper.toPatientsResponse(patient))
            return {
                patients: mappedPatients,
                totalRegistries
            }
        } catch ( err ) {
            throw err
        }
    }

    static findOnePatient = async (patientId:number):Promise<PatientResponse> => {
        const patientQ = patientQueries('read-one')
        const patientV = [patientId]
        try {
            const patient = await Database.execute<Patient[]>(patientQ, patientV)

            if( !patient || patient.length === 0 )
                throw this.errorHandler('not_found_error', `Patient with Id ${patientId} not found`)
            
            return PatientMapper.toPatientsResponse(patient[0])
        } catch ( err ) {
            throw err
        }
    }

    static insertPatient = async (patientParams:IncomingPatientParams):Promise<PatientResponse> => {
        const { birthdate, firstName, lastName, address, gender, phone, email, idNumber } = patientParams
        const patientQ = patientQueries('create')
        const patientV = [firstName, lastName, birthdate, phone, email, address, idNumber, gender]
        try {
            const newPatient = await Database.execute<ResultSetHeader>(patientQ, patientV)
            const { insertId } = newPatient
            return this.findOnePatient(insertId)
        } catch ( err:any ) {
            let error = new Error()
            if( err.code === 'ER_DUP_ENTRY') {
                error.name = 'duplicate_entry'
                error.message = `Duplicated entry ${email}`
               throw error 
            } else {
                throw err
            }
        }
    }

    static updatedPatient = async (patientParams:IncomingPatientParams, id:number):Promise<PatientResponse> => {
        const { firstName, lastName, phone, email, address, gender, birthdate } = patientParams
        const patientQ = patientQueries( 'update' )
        const patientV = [ firstName, lastName, birthdate, phone, email, address, gender, id ]
        try{
            const updatedPatient = await Database.execute<ResultSetHeader>(patientQ, patientV)
            const { affectedRows } = updatedPatient

            if ( affectedRows === 0)
                throw this.errorHandler('not_found_error', `No patient found with Id: ${id}, to update`)
            
            return await this.findOnePatient( id )
        } catch ( err ) {
            throw err
        }
    }

    static softDeletePatient = async (id:number):Promise<[boolean, number]> => {
        const patientQ = patientQueries( 'soft-delete' )
        const patientV = [0, id]
        try {
            const deletedPatient = await Database.execute<ResultSetHeader>(patientQ, patientV)
            const { affectedRows } = deletedPatient 
            
            if ( affectedRows === 0 )
                throw this.errorHandler('not_found_error', `No patient found with Id: ${id}, to delete`)

            return [true, id]
        } catch ( err ) {
            throw err
        }
    }

    private static errorHandler = (name:string, msg:string) => {
        const err = new Error()
        err.name = name
        err.message = msg
        return err
    }
}