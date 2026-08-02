import { and, desc, eq, isNull } from 'drizzle-orm'
import { PatientMovementsRepository } from '../../application/ports/patient-movements.repository'
import { PatientMovementsStore } from '../../domain/entities/Billing'
import { TenantContext } from '../database/TenantContext'
import { invoices, patientMovements, patients, users } from '../database/schema'

export class DrizzlePatientMovementsRepository implements PatientMovementsRepository {
  async load(): Promise<PatientMovementsStore> {
    const rows = await TenantContext.getDb()
      .select({
        movement: patientMovements,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        actorName: users.name,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(patientMovements)
      .innerJoin(patients, eq(patientMovements.patientId, patients.id))
      .leftJoin(users, eq(patientMovements.actorId, users.id))
      .leftJoin(invoices, eq(patientMovements.careEpisodeId, invoices.careEpisodeId))
      .where(and(isNull(patientMovements.deletedAt), isNull(patients.deletedAt)))
      .orderBy(desc(patientMovements.occurredAt))

    return {
      events: rows.map(({ movement, patientFirstName, patientLastName, actorName, invoiceNumber }) => ({
        id: movement.id,
        patientId: movement.patientId,
        patientName: `${patientFirstName} ${patientLastName}`.trim(),
        encounterId: movement.careEpisodeId ?? undefined,
        invoiceNumber: invoiceNumber ?? undefined,
        fromStation: movement.fromStation ?? undefined,
        toStation: movement.toStation,
        occurredAt: movement.occurredAt.toISOString(),
        reason: movement.reason ?? undefined,
        notes: movement.notes ?? undefined,
        actor: movement.actorId && actorName ? { id: movement.actorId, name: actorName } : undefined,
        source: movement.source,
        reference: {
          visitId: movement.clinicalEncounterId ?? undefined,
          bedId: movement.bedId ?? undefined,
          roomId: movement.operatingRoomId ?? undefined,
        },
      })),
      updatedAt: new Date().toISOString(),
    }
  }

  async save(store: PatientMovementsStore): Promise<void> {
    const db = TenantContext.getDb()
    await db.transaction(async (tx) => {
      await tx.update(patientMovements).set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(isNull(patientMovements.deletedAt))
      for (const event of store.events) {
        const values = {
          id: event.id,
          patientId: event.patientId,
          careEpisodeId: event.encounterId ?? null,
          actorId: event.actor?.id ?? null,
          fromStation: event.fromStation ?? null,
          toStation: event.toStation,
          occurredAt: new Date(event.occurredAt),
          reason: event.reason ?? null,
          notes: event.notes ?? null,
          source: event.source,
          clinicalEncounterId: event.reference?.visitId ?? null,
          bedId: event.reference?.bedId ?? null,
          operatingRoomId: event.reference?.roomId ?? null,
          deletedAt: null,
          updatedAt: new Date(),
        }
        await tx.insert(patientMovements).values(values).onDuplicateKeyUpdate({ set: values })
      }
    })
  }

  async update<T>(mutator: (store: PatientMovementsStore) => T | Promise<T>): Promise<T> {
    const store = await this.load()
    const result = await mutator(store)
    await this.save(store)
    return result
  }
}
