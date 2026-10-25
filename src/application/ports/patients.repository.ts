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
    identificationType?: 'identidad' | 'pasaporte' | 'carne_residencia'
    notes?: string
    emergencyContact?: { name: string; relationship: string; phone: string; email?: string; address?: string } | null
}

export type PatientUpdateParams = Partial<PatientCreateParams>

export interface PatientsRepository {
    findAll(args: { limit: number; offset: number; term?: string }): Promise<Patient[]>
    findById(id: string): Promise<Patient | null>
    create(params: PatientCreateParams): Promise<string>
    update(id: string, params: PatientUpdateParams): Promise<number>
    softDelete(id: string): Promise<number>
}
