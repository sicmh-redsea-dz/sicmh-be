import { Patient } from '../../domain/entities/Patient'

export interface PatientCreateParams {
    birthdate: string
    firstName: string
    lastName: string
    address: string
    gender: string
    phone: string
    email?: string | null
    identificationType?: 'identidad' | 'pasaporte' | 'carne_residencia'
    id: string
    emergencyContact?: EmergencyContactParams
}

export type PatientUpdateParams = Partial<PatientCreateParams>

export interface EmergencyContactParams {
    name?: string
    relationship?: string
    phone?: string
    email?: string
    address?: string
}

export interface PatientsRepository {
    findAll(args: { limit: number; offset: number; term?: string }): Promise<Patient[]>
    findById(id: number): Promise<Patient | null>
    create(params: PatientCreateParams): Promise<number>
    update(id: number, params: PatientUpdateParams): Promise<number>
    softDelete(id: number): Promise<number>
}
