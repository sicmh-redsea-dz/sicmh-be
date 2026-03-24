import { AuditActor } from './Bed'

export type BillingStation =
  | 'consulta'
  | 'emergencia'
  | 'hospitalizacion'
  | 'quirofano'
  | 'observacion'
  | 'laboratorio'
  | 'imagen'
  | 'farmacia'
  | 'admision'
  | 'alta'
  | 'otros'

export type BillingItemCategory =
  | 'factura'
  | 'servicio'
  | 'insumo'
  | 'estancia'
  | 'procedimiento'
  | 'medicamento'
  | 'honorarios'
  | 'otros'

export type BillingItemStatus = 'Pagado' | 'Pendiente' | 'Anulado'

export type BillingItemSource = 'invoice' | 'stock' | 'manual' | 'movement'

export interface BillingLedgerItem {
  id: string
  patientId: number
  patientName: string
  encounterId?: string
  invoiceNumber?: string
  station?: BillingStation | string
  category: BillingItemCategory
  description: string
  quantity: number
  unitPrice: number
  total: number
  occurredAt: string
  status: BillingItemStatus
  source: BillingItemSource
  reference?: {
    invoiceNumber?: string
    visitId?: number
    movementId?: string
    productId?: number
  }
}

export interface BillingLedgerStore {
  items: BillingLedgerItem[]
  updatedAt: string
}

export type MovementSource = 'visit' | 'bed' | 'oroom' | 'manual'

export interface PatientMovementEvent {
  id: string
  patientId: number
  patientName: string
  encounterId?: string
  invoiceNumber?: string
  fromStation?: BillingStation | string
  toStation: BillingStation | string
  occurredAt: string
  reason?: string
  notes?: string
  actor?: AuditActor
  source: MovementSource
  reference?: {
    visitId?: number
    bedId?: number
    roomId?: number
  }
}

export type EncounterStatus = 'Pendiente' | 'Pagado' | 'Anulado'

export interface PatientEncounter {
  id: string
  patientId: number
  patientName: string
  doctorId?: number
  doctorName?: string
  origin?: BillingStation | string
  invoiceNumber: string
  invoiceId?: number
  status: EncounterStatus
  createdAt: string
  updatedAt?: string
  closedAt?: string
  previousEncounterId?: string
}

export interface PatientEncountersStore {
  encounters: PatientEncounter[]
  updatedAt: string
}

export interface PatientMovementsStore {
  events: PatientMovementEvent[]
  updatedAt: string
}
