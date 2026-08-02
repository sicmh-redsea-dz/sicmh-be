import { eq, isNull, and } from 'drizzle-orm'
import { ExpedienteRepository } from '../../application/ports/expediente.repository'
import { ExpedienteExtra, ExpedienteModule } from '../../domain/entities/Expediente'
import { TenantContext } from '../database/TenantContext'
import { clinicalEncounters, medicalRecords } from '../database/schema/tenant'

const toModule = (row: typeof medicalRecords.$inferSelect): ExpedienteModule => ({
  followUpPlan: row.followUpPlan ?? undefined,
  referrals: row.referrals ?? undefined,
  triageLevel: row.triageLevel ?? undefined,
  arrivalMode: row.arrivalMode ?? undefined,
  painScale: row.painScale ?? undefined,
  glasgow: row.glasgowScore ?? undefined,
  disposition: row.disposition ?? undefined,
  injuryMechanism: row.injuryMechanism ?? undefined,
  preOpDiagnosis: row.preoperativeDiagnosis ?? undefined,
  postOpDiagnosis: row.postoperativeDiagnosis ?? undefined,
  procedure: row.procedureName ?? undefined,
  anesthesiaType: row.anesthesiaType ?? undefined,
  surgeryStart: row.surgeryStartedAt?.toISOString(),
  surgeryEnd: row.surgeryEndedAt?.toISOString(),
  findings: row.findings ?? undefined,
  complications: row.complications ?? undefined,
  admissionDiagnosis: row.admissionDiagnosis ?? undefined,
  admissionReason: row.admissionReason ?? undefined,
  service: row.serviceName ?? undefined,
  bed: row.bedLabel ?? undefined,
  evolutionSummary: row.evolutionSummary ?? undefined,
  dischargePlan: row.dischargePlan ?? undefined,
  dischargeDate: row.dischargedAt?.toISOString(),
})

export class DrizzleExpedienteRepository implements ExpedienteRepository {
  async findByHistoryId(id: string): Promise<ExpedienteExtra | null> {
    const [row] = await TenantContext.getDb()
      .select({ record: medicalRecords, encounter: clinicalEncounters })
      .from(medicalRecords)
      .innerJoin(clinicalEncounters, eq(medicalRecords.clinicalEncounterId, clinicalEncounters.id))
      .where(and(
        eq(medicalRecords.clinicalEncounterId, id),
        isNull(medicalRecords.deletedAt),
        isNull(clinicalEncounters.deletedAt),
      ))
      .limit(1)
    if (!row) return null
    const origin = {
      outpatient: 'visits',
      emergency: 'emergency',
      hospitalization: 'hospitalization',
      operating_room: 'oroom',
    }[row.encounter.type] as ExpedienteExtra['origin']
    return {
      historyId: row.encounter.id,
      patientId: row.encounter.patientId,
      origin,
      standard: {
        chiefComplaint: row.record.chiefComplaint,
        currentIllness: row.record.currentIllness,
        physicalExam: row.record.physicalExam,
        allergies: row.record.allergies ?? undefined,
        currentMeds: row.record.currentMedications ?? undefined,
      },
      module: toModule(row.record),
      createdAt: row.record.createdAt.toISOString(),
      updatedAt: row.record.updatedAt.toISOString(),
    }
  }

  async upsert(historyId: string, data: ExpedienteExtra): Promise<void> {
    const values = {
      clinicalEncounterId: historyId,
      chiefComplaint: data.standard.chiefComplaint,
      currentIllness: data.standard.currentIllness,
      physicalExam: data.standard.physicalExam,
      allergies: data.standard.allergies,
      currentMedications: data.standard.currentMeds,
      followUpPlan: data.module.followUpPlan,
      referrals: data.module.referrals,
      triageLevel: data.module.triageLevel,
      arrivalMode: data.module.arrivalMode,
      painScale: data.module.painScale,
      glasgowScore: typeof data.module.glasgow === 'number' ? data.module.glasgow : undefined,
      disposition: data.module.disposition,
      injuryMechanism: data.module.injuryMechanism,
      preoperativeDiagnosis: data.module.preOpDiagnosis,
      postoperativeDiagnosis: data.module.postOpDiagnosis,
      procedureName: data.module.procedure,
      anesthesiaType: data.module.anesthesiaType,
      surgeryStartedAt: data.module.surgeryStart ? new Date(data.module.surgeryStart) : undefined,
      surgeryEndedAt: data.module.surgeryEnd ? new Date(data.module.surgeryEnd) : undefined,
      findings: data.module.findings,
      complications: data.module.complications,
      admissionDiagnosis: data.module.admissionDiagnosis,
      admissionReason: data.module.admissionReason,
      serviceName: data.module.service,
      bedLabel: data.module.bed,
      evolutionSummary: data.module.evolutionSummary,
      dischargePlan: data.module.dischargePlan,
      dischargedAt: data.module.dischargeDate ? new Date(data.module.dischargeDate) : undefined,
    }
    await TenantContext.getDb()
      .insert(medicalRecords)
      .values(values)
      .onDuplicateKeyUpdate({ set: { ...values, deletedAt: null } })
  }
}
