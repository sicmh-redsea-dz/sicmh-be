import { and, desc, eq, isNull } from 'drizzle-orm'
import { TenantContext } from '../../infrastructure/database/TenantContext'
import { clinicalEncounters, encounterClinicalReviews, medicalRecords, patientClinicalProfiles, patients } from '../../infrastructure/database/schema/tenant'
import { clinicalProfileFields, ClinicalProfileData, ClinicalProfileReview, emptyClinicalProfile, profileValidation, validateClinicalProfileReview } from '../../domain/entities/ClinicalProfile'

export const legacyProfileCandidates = (rows: Array<Record<string, unknown>>) => {
  const data = emptyClinicalProfile()
  const conflicts: Partial<Record<typeof clinicalProfileFields[number], string[]>> = {}
  for (const field of clinicalProfileFields) {
    const values = [...new Set(rows.map(row => typeof row[field] === 'string' ? (row[field] as string).trim() : '').filter(Boolean))]
    if (values.length === 1) data[field] = values[0]
    if (values.length > 1) conflicts[field] = values
  }
  if (data.allergies) data.allergyStatus = 'recorded'
  return { data, conflicts }
}

export class ClinicalProfileService {
  private async latest(patientId: string, lock = false) {
    const query = TenantContext.getDb().select().from(patientClinicalProfiles)
      .where(eq(patientClinicalProfiles.patientId, patientId)).orderBy(desc(patientClinicalProfiles.version)).limit(1)
    const [row] = await (lock ? query.for('update') : query)
    return row
  }

  async get(patientId: string) {
    const db = TenantContext.getDb()
    const [patient] = await db.select({ id: patients.id }).from(patients)
      .where(and(eq(patients.id, patientId), isNull(patients.deletedAt))).limit(1)
    if (!patient) throw Object.assign(new Error('Paciente no encontrado.'), { name: 'not_found_error' })
    const latest = await this.latest(patientId)
    if (latest) return { version: latest.version, data: latest.data, conflicts: {}, updatedAt: latest.createdAt, recordedBy: latest.recordedBy }
    // Proposals only. Never silently promote conflicting historical entries to current truth.
    const rows = await db.select({ familyHst: clinicalEncounters.familyHistory, backgroundHst: clinicalEncounters.habitsHistory,
      pathologicalHst: clinicalEncounters.pathologicalHistory, surgicalHst: clinicalEncounters.surgicalHistory,
      allergies: medicalRecords.allergies, currentMeds: medicalRecords.currentMedications })
      .from(clinicalEncounters).leftJoin(medicalRecords, and(eq(medicalRecords.clinicalEncounterId, clinicalEncounters.id), isNull(medicalRecords.deletedAt)))
      .where(and(eq(clinicalEncounters.patientId, patientId), isNull(clinicalEncounters.deletedAt)))
    return { version: 0, ...legacyProfileCandidates(rows), updatedAt: null, recordedBy: null }
  }

  /** Call inside the encounter transaction. Lock the patient to serialize concurrent first versions. */
  async review(patientId: string, encounterId: string, input: ClinicalProfileReview, actorId: string) {
    const review = validateClinicalProfileReview(input)
    if (!actorId) throw profileValidation('No se pudo identificar al usuario que reviso la ficha.')
    const db = TenantContext.getDb()
    const [patient] = await db.select({ id: patients.id }).from(patients)
      .where(and(eq(patients.id, patientId), isNull(patients.deletedAt))).for('update')
    if (!patient) throw profileValidation('Paciente no encontrado.')
    const previous = await this.latest(patientId, true)
    if ((previous?.version ?? 0) !== review.version) throw profileValidation('La ficha clinica cambio en otra sesion. Vuelva a cargarla y revise los cambios antes de guardar.')
    let profileId = previous?.id
    const changed = !previous || Object.keys(review.data).some(key => review.data[key as keyof ClinicalProfileData] !== previous.data[key as keyof ClinicalProfileData])
    if (changed) {
      const [created] = await db.insert(patientClinicalProfiles).values({ patientId, version: review.version + 1, data: review.data, recordedBy: actorId }).$returningId()
      profileId = created.id
    }
    await db.insert(encounterClinicalReviews).values({ clinicalEncounterId: encounterId, profileId: profileId!, reviewedBy: actorId })
    return review.data
  }

  async snapshot(encounterId: string) {
    const [row] = await TenantContext.getDb().select({ data: patientClinicalProfiles.data, version: patientClinicalProfiles.version,
      reviewedAt: encounterClinicalReviews.createdAt, reviewedBy: encounterClinicalReviews.reviewedBy })
      .from(encounterClinicalReviews).innerJoin(patientClinicalProfiles, eq(encounterClinicalReviews.profileId, patientClinicalProfiles.id))
      .where(eq(encounterClinicalReviews.clinicalEncounterId, encounterId)).limit(1)
    return row ?? null
  }
}
