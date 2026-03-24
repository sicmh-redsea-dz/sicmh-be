import { ExpedientePayload } from '../entities/Expediente'
import { PatientResponse } from './PatientResponse'
import { StaffResponse } from './StaffResponse'
import { StockResponse } from './StockResponse'

export interface FindAllVistiHistories {
    visits: ShortHistoryResponse[]
    staff: StaffResponse[]
    stock: StockResponse[]
    patients: PatientResponse[]
    totalRecords: number
}

export interface ShortHistoryResponse {
    id: number
    doctorName: string
    patientName: string
    lastVisitDate: string
    diagnosis: string
    patientId: string
    invoiceNumber: string
    state: string
    visitType?: string
    originStation?: string
    currentStation?: string
    movedTo?: string
    movementFrom?: string
    movementTo?: string
    movementAt?: string
    movementTrail?: string[]
}

export interface HistoryResponse {
    id: number
    patientId: number
    visitDate: Date
    diagnosis: string | null
    treatment: string | null
    notes: string
    bloodPressure: string
    oxygenSaturation: number
    temperature: string
    glucoseLevel: string
    weight: string
    height: string
    BMI: string | null
    bodyFatPercentage: string | null
    visceralFat: string | null
    ageBasedOnWeight: string | null
    lastVisitDate: Date
    visitType: string
    invoiceId: number
    staffId: number
    familyHst       : string | null
    backgroundHst   : string | null
    pathologicalHst : string | null
    surgicalHst     : string | null
    patientName: string
    docName: string
    usedInventory : { stockId: number, stockQty: number}[]
    expediente?: ExpedientePayload | null
}
