import { v4 as uuidv4 } from 'uuid'

import { OrRoomsRepository } from '../ports/or-rooms.repository'
import { AuditActor } from '../../domain/entities/Bed'
import { OrRoomAssignment, OrRoomHistoryEntry, OrRoomRecord, OrRoomStatus } from '../../domain/entities/OrRoom'

interface RoomPayload {
  code: string
  specialty?: string
  status?: OrRoomStatus
}

interface AssignPayload {
  assignmentId?: string
  patientId: number
  patientName: string
  doctorId?: number
  doctorName?: string
  procedure?: string
  anesthesiaType?: string
  scheduledStart?: string
  scheduledEnd?: string
  notes?: string
}

interface ReleasePayload {
  reason?: string
  status?: OrRoomStatus
}

export class OrRoomsService {
  constructor(private readonly roomsRepo: OrRoomsRepository) {}

  getRooms = async () => {
    const store = await this.roomsRepo.load()
    return { rooms: store.rooms }
  }

  createRoom = async (payload: RoomPayload, actor?: AuditActor) => {
    const errors: string[] = []
    if (!payload.code || !payload.code.trim()) errors.push('El codigo de quirófano es requerido.')
    if (errors.length > 0) throw this.buildValidationError(errors)

    const store = await this.roomsRepo.load()
    const rooms = store.rooms
    const id = rooms.length > 0 ? Math.max(...rooms.map((r) => r.id)) + 1 : 1
    const now = new Date().toISOString()

    const room: OrRoomRecord = {
      id,
      code: payload.code.trim(),
      specialty: payload.specialty?.trim() || '',
      status: payload.status ?? 'available',
      currentAssignment: null,
      history: [this.buildHistory('create', actor, { code: payload.code, specialty: payload.specialty, status: payload.status })]
    }

    rooms.push(room)
    store.updatedAt = now
    await this.roomsRepo.save(store)

    return { rooms }
  }

  updateRoom = async (roomId: number, payload: RoomPayload, actor?: AuditActor) => {
    const store = await this.roomsRepo.load()
    const rooms = store.rooms
    const room = rooms.find((r) => r.id === roomId)
    if (!room) throw this.buildNotFoundError(`No OR room found with id ${roomId}`)

    const prevStatus = room.status
    room.code = payload.code?.trim() || room.code
    room.specialty = payload.specialty?.trim() ?? room.specialty
    if (payload.status) room.status = payload.status

    room.history.push(this.buildHistory('update', actor, { code: room.code, specialty: room.specialty, status: room.status }))

    if (payload.status && payload.status !== prevStatus) {
      room.history.push(this.buildHistory('status_change', actor, { from: prevStatus, to: payload.status }))
    }

    store.updatedAt = new Date().toISOString()
    await this.roomsRepo.save(store)

    return { rooms }
  }

  assignRoom = async (roomId: number, payload: AssignPayload, actor?: AuditActor) => {
    const errors: string[] = []
    if (!payload.patientId) errors.push('Paciente requerido para asignar quirófano.')
    if (!payload.patientName || !payload.patientName.trim()) errors.push('Nombre del paciente requerido.')
    if (errors.length > 0) throw this.buildValidationError(errors)

    const store = await this.roomsRepo.load()
    const rooms = store.rooms
    const room = rooms.find((r) => r.id === roomId)
    if (!room) throw this.buildNotFoundError(`No OR room found with id ${roomId}`)

    const now = new Date().toISOString()
    const payloadData: OrRoomAssignment = {
      assignmentId: payload.assignmentId || room.currentAssignment?.assignmentId || uuidv4(),
      patientId: payload.patientId,
      patientName: payload.patientName.trim(),
      doctorId: payload.doctorId,
      doctorName: payload.doctorName?.trim() || undefined,
      procedure: payload.procedure?.trim() || undefined,
      anesthesiaType: payload.anesthesiaType?.trim() || undefined,
      scheduledStart: payload.scheduledStart || undefined,
      scheduledEnd: payload.scheduledEnd || undefined,
      notes: payload.notes?.trim() || undefined,
      assignedAt: room.currentAssignment?.assignedAt ?? now,
      updatedAt: room.currentAssignment ? now : undefined
    }

    if (room.currentAssignment) {
      const previous = room.currentAssignment
      room.currentAssignment = payloadData
      room.history.push(this.buildHistory('update_assignment', actor, { previous, next: payloadData }))
    } else {
      room.currentAssignment = payloadData
      room.status = 'occupied'
      room.history.push(this.buildHistory('assign', actor, { assignment: payloadData }))
    }

    store.updatedAt = now
    await this.roomsRepo.save(store)

    return { rooms }
  }

  releaseRoom = async (roomId: number, payload?: ReleasePayload, actor?: AuditActor) => {
    const store = await this.roomsRepo.load()
    const rooms = store.rooms
    const room = rooms.find((r) => r.id === roomId)
    if (!room) throw this.buildNotFoundError(`No OR room found with id ${roomId}`)
    if (!room.currentAssignment) throw this.buildValidationError(['El quirófano no tiene asignacion activa.'])

    const now = new Date().toISOString()
    const releasedAssignment = { ...room.currentAssignment, releasedAt: now }

    room.currentAssignment = null
    room.status = payload?.status ?? 'available'
    room.history.push(this.buildHistory('release', actor, { assignment: releasedAssignment, reason: payload?.reason }))

    store.updatedAt = now
    await this.roomsRepo.save(store)

    return { rooms }
  }

  private buildHistory(type: OrRoomHistoryEntry['type'], actor?: AuditActor, details?: Record<string, any>): OrRoomHistoryEntry {
    return {
      eventId: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      actor,
      details
    }
  }

  private buildValidationError(messages: string[]) {
    const err: any = new Error('Validation error')
    err.name = 'validation_errors'
    err.errors = messages.map((msg) => ({ msg }))
    return err
  }

  private buildNotFoundError(message: string) {
    const err: any = new Error(message)
    err.name = 'not_found_error'
    return err
  }
}
