export type BedModule = 'hospitalization' | 'emergency'

export type BedStatus = 'available' | 'occupied' | 'maintenance' | 'blocked'

export interface AuditActor {
  id: string
  name: string
  role?: string
}

export interface BedAssignment {
  assignmentId: string
  patientId: string
  patientName: string
  doctorId?: string
  doctorName?: string
  reason?: string
  notes?: string
  expectedDischarge?: string
  assignedAt: string
  updatedAt?: string
  releasedAt?: string
}

export interface BedHistoryEntry {
  eventId: string
  type: 'create' | 'update' | 'assign' | 'update_assignment' | 'release' | 'status_change'
  timestamp: string
  actor?: AuditActor
  details?: Record<string, any>
}

export interface BedRecord {
  id: string
  code: string
  area?: string
  status: BedStatus
  currentAssignment?: BedAssignment | null
  history: BedHistoryEntry[]
}

export interface BedsStoreModule {
  beds: BedRecord[]
  updatedAt: string
}

export interface BedsStore {
  hospitalization: BedsStoreModule
  emergency: BedsStoreModule
}
