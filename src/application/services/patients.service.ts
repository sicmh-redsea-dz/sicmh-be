import { PatientsRepository, PatientCreateParams, PatientUpdateParams } from '../ports/patients.repository'
import { PatientMapper } from '../../domain/mappers/PatientMapper'
import { PatientResponse } from '../../domain/responses/PatientResponse'

interface Delimiters {
    limit: number
    offset: number
    term?: string
}

interface findAllPatientsResponse {
    patients: PatientResponse[],
    totalRegistries: number
}

export class PatientsService {
    constructor(private readonly patientsRepo: PatientsRepository) {}

    findAllPatients = async (args: Delimiters):Promise<findAllPatientsResponse> => {
        try {
            const patients = await this.patientsRepo.findAll(args)
            const totalRegistries = patients.length > 0 ? patients[0].total_registries : 0
            const mappedPatients = patients.map(patient => PatientMapper.toPatientsResponse(patient))
            return {
                patients: mappedPatients,
                totalRegistries
            }
        } catch ( err ) {
            throw err
        }
    }

    findOnePatient = async (patientId:number):Promise<PatientResponse> => {
        try {
            const patient = await this.patientsRepo.findById( patientId )
            if( !patient )
                throw this.errorHandler('not_found_error', `Patient with Id ${patientId} not found`)
            
            return PatientMapper.toPatientsResponse(patient)
        } catch ( err ) {
            throw err
        }
    }

    insertPatient = async (patientParams:PatientCreateParams):Promise<PatientResponse> => {
        const { email, id } = patientParams
        try {
            const insertId = await this.patientsRepo.create(patientParams)
            return this.findOnePatient( insertId )
        } catch ( err:any ) {
            let error = new Error()
            if( err.code === 'ER_DUP_ENTRY') {
                error.name = 'duplicate_entry'
                error.message = `Duplicated entry ${email || id}`
               throw error 
            } else {
                throw err
            }
        }
    }

    updatedPatient = async (patientParams:PatientUpdateParams, id:number):Promise<PatientResponse> => {
        try{
            const affectedRows = await this.patientsRepo.update( id, patientParams )
            if ( affectedRows === 0)
                throw this.errorHandler('not_found_error', `No patient found with Id: ${id}, to update`)
            
            return await this.findOnePatient( id )
        } catch ( err ) {
            throw err
        }
    }

    softDeletePatient = async (id:number):Promise<[boolean, number]> => {
        try {
            const affectedRows = await this.patientsRepo.softDelete( id )
            if ( affectedRows === 0 )
                throw this.errorHandler('not_found_error', `No patient found with Id: ${id}, to delete`)

            return [true, id]
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
