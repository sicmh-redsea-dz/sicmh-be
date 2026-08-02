import { and, desc, eq, isNull } from 'drizzle-orm'
import { PatientEncountersRepository } from '../../application/ports/patient-encounters.repository'
import { PatientEncountersStore } from '../../domain/entities/Billing'
import { TenantContext } from '../database/TenantContext'
import { careEpisodes, invoices, patients, staffMembers } from '../database/schema'

export class DrizzlePatientEncountersRepository implements PatientEncountersRepository {
  async load(): Promise<PatientEncountersStore> {
    const rows = await TenantContext.getDb()
      .select({
        episode: careEpisodes,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        doctorFirstName: staffMembers.firstName,
        doctorLastName: staffMembers.lastName,
        invoiceId: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(careEpisodes)
      .innerJoin(patients, eq(careEpisodes.patientId, patients.id))
      .leftJoin(staffMembers, eq(careEpisodes.staffMemberId, staffMembers.id))
      .leftJoin(invoices, eq(careEpisodes.id, invoices.careEpisodeId))
      .where(and(isNull(careEpisodes.deletedAt), isNull(patients.deletedAt)))
      .orderBy(desc(careEpisodes.openedAt))

    return {
      encounters: rows.map(({ episode, patientFirstName, patientLastName, doctorFirstName, doctorLastName, invoiceId, invoiceNumber }) => ({
        id: episode.id,
        patientId: episode.patientId,
        patientName: `${patientFirstName} ${patientLastName}`.trim(),
        doctorId: episode.staffMemberId ?? undefined,
        doctorName: doctorFirstName ? `${doctorFirstName} ${doctorLastName ?? ''}`.trim() : undefined,
        origin: episode.origin ?? undefined,
        invoiceNumber: invoiceNumber ?? '',
        invoiceId: invoiceId ?? undefined,
        status: episode.status,
        createdAt: episode.openedAt.toISOString(),
        updatedAt: episode.updatedAt.toISOString(),
        closedAt: episode.closedAt?.toISOString(),
        previousEncounterId: episode.previousEpisodeId ?? undefined,
      })),
      updatedAt: new Date().toISOString(),
    }
  }

  async save(store: PatientEncountersStore): Promise<void> {
    const db = TenantContext.getDb()
    await db.transaction(async (tx) => {
      await tx.update(careEpisodes).set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(isNull(careEpisodes.deletedAt))
      for (const encounter of store.encounters) {
        const values = {
          id: encounter.id,
          patientId: encounter.patientId,
          staffMemberId: encounter.doctorId ?? null,
          previousEpisodeId: encounter.previousEncounterId ?? null,
          origin: encounter.origin ?? null,
          status: encounter.status,
          openedAt: new Date(encounter.createdAt),
          closedAt: encounter.closedAt ? new Date(encounter.closedAt) : null,
          deletedAt: null,
          updatedAt: encounter.updatedAt ? new Date(encounter.updatedAt) : new Date(),
        }
        await tx.insert(careEpisodes).values(values).onDuplicateKeyUpdate({ set: values })
        if (encounter.invoiceId) {
          await tx.update(invoices).set({ careEpisodeId: encounter.id, updatedAt: new Date() })
            .where(eq(invoices.id, encounter.invoiceId))
        }
      }
    })
  }

  async update<T>(mutator: (store: PatientEncountersStore) => T | Promise<T>): Promise<T> {
    const store = await this.load()
    const result = await mutator(store)
    await this.save(store)
    return result
  }
}
