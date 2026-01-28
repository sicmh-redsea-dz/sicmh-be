import { Patient } from '../../domain/entities/Patient'

export interface PatientCreateParams {
    birthdate: string
    firstName: string
    lastName: string
    address: string
    gender: string
    phone: string
    email: string
    id?: string
}

export type PatientUpdateParams = Partial<PatientCreateParams>

export interface PatientsRepository {
    findAll(args: { limit: number; offset: number; term?: string }): Promise<Patient[]>
    findById(id: number): Promise<Patient | null>
    create(params: PatientCreateParams): Promise<number>
    update(id: number, params: PatientUpdateParams): Promise<number>
    softDelete(id: number): Promise<number>
}
