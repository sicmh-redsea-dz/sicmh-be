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

    findOnePatient = async (patientId:string):Promise<PatientResponse> => {
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
        this.validateIdentification(patientParams.id, patientParams.identificationType ?? 'identidad')
        try {
            const insertId = await this.patientsRepo.create(patientParams)
            return this.findOnePatient( insertId )
        } catch ( err:any ) {
            throw this.patientWriteError(err)
        }
    }

    updatedPatient = async (patientParams:PatientUpdateParams, id:string):Promise<PatientResponse> => {
        try{
            if (patientParams.id !== undefined || patientParams.identificationType !== undefined) {
                const existing = await this.patientsRepo.findById(id)
                if (!existing) throw this.errorHandler('not_found_error', `Patient with Id ${id} not found`)
                this.validateIdentification(patientParams.id ?? existing.Identificacion,
                    patientParams.identificationType ?? existing.identificationType ?? 'identidad')
            }
            const affectedRows = await this.patientsRepo.update( id, patientParams )
            if ( affectedRows === 0)
                throw this.errorHandler('not_found_error', `No patient found with Id: ${id}, to update`)
            
            return await this.findOnePatient( id )
        } catch ( err ) {
            throw this.patientWriteError(err)
        }
    }

    softDeletePatient = async (id:string):Promise<[boolean, string]> => {
        try {
            const affectedRows = await this.patientsRepo.softDelete( id )
            if ( affectedRows === 0 )
                throw this.errorHandler('not_found_error', `No patient found with Id: ${id}, to delete`)

            return [true, id]
        } catch ( err ) {
            throw err
        }
    }

    private patientWriteError(err: any): unknown {
        const seen = new Set<unknown>()
        for (let cause = err; cause && !seen.has(cause); cause = cause.cause) {
            seen.add(cause)
            if (cause.code === 'ER_DUP_ENTRY') {
                return Object.assign(new Error('Ya existe un paciente con este número de identificación. Verifica el número o busca al paciente en el listado antes de registrarlo nuevamente.'), {
                    name: 'patient_identification_conflict', code: 'PATIENT_IDENTIFICATION_EXISTS', field: 'id',
                })
            }
        }
        return err
    }

    private validateIdentification(value: string | undefined, type: string) {
        const patterns: Record<string, RegExp> = { identidad: /^\d{13}$/, carne_residencia: /^\d{1,19}$/, pasaporte: /^[A-Za-z0-9]{1,50}$/ }
        if (typeof value !== 'string' || !patterns[type]?.test(value)) {
            const message = 'Identificacion invalida: identidad requiere 13 digitos; residencia hasta 19 digitos; pasaporte letras y numeros hasta 50 caracteres.'
            throw Object.assign(new Error(message), { name: 'validation_errors', errors: [{ msg: message }] })
        }
    }

    private errorHandler = (name:string, msg:string) => {
        const err = new Error()
        err.name = name
        err.message = msg
        return err
    }
}
