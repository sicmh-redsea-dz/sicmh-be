import { and, eq, isNull } from 'drizzle-orm'
import { OrRoomsRepository } from '../../application/ports/or-rooms.repository'
import { OrRoomHistoryEntry, OrRoomRecord, OrRoomsStore } from '../../domain/entities/OrRoom'
import { TenantContext } from '../database/TenantContext'
import {
  operatingRoomAssignments,
  operatingRoomEvents,
  operatingRooms,
  patients,
  roles,
  staffMembers,
  users,
} from '../database/schema/tenant'

export class DrizzleOrRoomsRepository implements OrRoomsRepository {
  async load(): Promise<OrRoomsStore> {
    const db = TenantContext.getDb()
    const [roomRows, assignmentRows, eventRows, patientRows, staffRows, userRows] = await Promise.all([
      db.select().from(operatingRooms).where(isNull(operatingRooms.deletedAt)),
      db.select().from(operatingRoomAssignments).where(isNull(operatingRoomAssignments.deletedAt)),
      db.select().from(operatingRoomEvents).where(isNull(operatingRoomEvents.deletedAt)),
      db.select().from(patients).where(isNull(patients.deletedAt)),
      db.select().from(staffMembers).where(isNull(staffMembers.deletedAt)),
      db
        .select({ user: users, role: roles })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(and(isNull(users.deletedAt), isNull(roles.deletedAt))),
    ])
    const patientById = new Map(patientRows.map((patient) => [
      patient.id,
      `${patient.firstName} ${patient.lastName}`.trim(),
    ]))
    const staffById = new Map(staffRows.map((staff) => [
      staff.id,
      `${staff.firstName} ${staff.lastName}`.trim(),
    ]))
    const actorById = new Map(userRows.map(({ user, role }) => [
      user.id,
      { id: user.id, name: user.name, role: role.name },
    ]))
    const rooms = roomRows.map((room): OrRoomRecord => {
      const assignment = assignmentRows.find((candidate) =>
        candidate.operatingRoomId === room.id && candidate.releasedAt === null
      )
      return {
        id: room.id,
        code: room.code,
        specialty: room.specialty ?? '',
        status: room.status,
        currentAssignment: assignment ? {
          assignmentId: assignment.id,
          patientId: assignment.patientId,
          patientName: patientById.get(assignment.patientId) ?? '',
          doctorId: assignment.staffMemberId ?? undefined,
          doctorName: assignment.staffMemberId ? staffById.get(assignment.staffMemberId) : undefined,
          procedure: assignment.procedureName ?? undefined,
          anesthesiaType: assignment.anesthesiaType ?? undefined,
          scheduledStart: assignment.scheduledStartAt?.toISOString(),
          scheduledEnd: assignment.scheduledEndAt?.toISOString(),
          notes: assignment.notes ?? undefined,
          assignedAt: assignment.assignedAt.toISOString(),
          updatedAt: assignment.updatedAt.toISOString(),
        } : null,
        history: eventRows
          .filter((event) => event.operatingRoomId === room.id)
          .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime())
          .map((event): OrRoomHistoryEntry => ({
            eventId: event.id,
            type: event.type as OrRoomHistoryEntry['type'],
            timestamp: event.occurredAt.toISOString(),
            actor: event.actorId ? actorById.get(event.actorId) : undefined,
            details: event.details ?? undefined,
          })),
      }
    })
    return { rooms, updatedAt: new Date().toISOString() }
  }

  async save(store: OrRoomsStore): Promise<void> {
    const db = TenantContext.getDb()
    for (const room of store.rooms) {
      await db
        .insert(operatingRooms)
        .values({ id: room.id, code: room.code, specialty: room.specialty, status: room.status })
        .onDuplicateKeyUpdate({
          set: { code: room.code, specialty: room.specialty, status: room.status, deletedAt: null },
        })

      if (room.currentAssignment) {
        const assignment = room.currentAssignment
        await db
          .insert(operatingRoomAssignments)
          .values({
            id: assignment.assignmentId,
            operatingRoomId: room.id,
            patientId: assignment.patientId,
            staffMemberId: assignment.doctorId,
            procedureName: assignment.procedure,
            anesthesiaType: assignment.anesthesiaType,
            scheduledStartAt: assignment.scheduledStart ? new Date(assignment.scheduledStart) : undefined,
            scheduledEndAt: assignment.scheduledEnd ? new Date(assignment.scheduledEnd) : undefined,
            notes: assignment.notes,
            assignedAt: new Date(assignment.assignedAt),
            releasedAt: assignment.releasedAt ? new Date(assignment.releasedAt) : null,
          })
          .onDuplicateKeyUpdate({
            set: {
              patientId: assignment.patientId,
              staffMemberId: assignment.doctorId,
              procedureName: assignment.procedure,
              anesthesiaType: assignment.anesthesiaType,
              scheduledStartAt: assignment.scheduledStart ? new Date(assignment.scheduledStart) : null,
              scheduledEndAt: assignment.scheduledEnd ? new Date(assignment.scheduledEnd) : null,
              notes: assignment.notes,
              releasedAt: assignment.releasedAt ? new Date(assignment.releasedAt) : null,
              deletedAt: null,
            },
          })
      } else {
        await db
          .update(operatingRoomAssignments)
          .set({ releasedAt: new Date() })
          .where(and(
            eq(operatingRoomAssignments.operatingRoomId, room.id),
            isNull(operatingRoomAssignments.releasedAt),
            isNull(operatingRoomAssignments.deletedAt),
          ))
      }

      for (const event of room.history) {
        await db
          .insert(operatingRoomEvents)
          .values({
            id: event.eventId,
            operatingRoomId: room.id,
            assignmentId: this.assignmentIdFromEvent(event),
            actorId: event.actor?.id,
            type: event.type,
            occurredAt: new Date(event.timestamp),
            details: event.details,
          })
          .onDuplicateKeyUpdate({ set: { details: event.details, type: event.type } })
      }
    }
  }

  async update<T>(mutator: (store: OrRoomsStore) => T | Promise<T>): Promise<T> {
    const store = await this.load()
    const result = await mutator(store)
    await this.save(store)
    return result
  }

  private assignmentIdFromEvent(event: OrRoomHistoryEntry): string | undefined {
    const details = event.details as { assignment?: { assignmentId?: string } } | undefined
    return details?.assignment?.assignmentId
  }
}
