import { AuditActor } from './Bed'

export type OrRoomStatus = 'available' | 'occupied' | 'maintenance' | 'blocked'

export interface OrRoomAssignment {
  assignmentId: string
  patientId: string
  patientName: string
  doctorId?: string
  doctorName?: string
  procedure?: string
  anesthesiaType?: string
  scheduledStart?: string
  scheduledEnd?: string
  notes?: string
  assignedAt: string
  updatedAt?: string
  releasedAt?: string
}

export interface OrRoomHistoryEntry {
  eventId: string
  type: 'create' | 'update' | 'assign' | 'update_assignment' | 'release' | 'status_change'
  timestamp: string
  actor?: AuditActor
  details?: Record<string, any>
}

export interface OrRoomRecord {
  id: string
  code: string
  specialty?: string
  status: OrRoomStatus
  currentAssignment?: OrRoomAssignment | null
  history: OrRoomHistoryEntry[]
}

export interface OrRoomsStore {
  rooms: OrRoomRecord[]
  updatedAt: string
}
