export type VisitOrigin = 'visits' | 'emergency' | 'hospitalization' | 'oroom'

export interface ExpedienteStandard {
  chiefComplaint: string
  currentIllness: string
  physicalExam: string
  allergies?: string
  currentMeds?: string
}

export interface ExpedienteModule {
  // Consulta externa
  followUpPlan?: string
  referrals?: string

  // Emergencia
  triageLevel?: string
  arrivalMode?: string
  painScale?: number
  glasgow?: number
  disposition?: string
  injuryMechanism?: string

  // Quirofano
  preOpDiagnosis?: string
  postOpDiagnosis?: string
  procedure?: string
  anesthesiaType?: string
  surgeryStart?: string
  surgeryEnd?: string
  findings?: string
  complications?: string

  // Hospitalizacion
  admissionDiagnosis?: string
  admissionReason?: string
  service?: string
  bed?: string
  evolutionSummary?: string
  dischargePlan?: string
  dischargeDate?: string
}

export interface ExpedientePayload {
  standard: ExpedienteStandard
  module: ExpedienteModule
}

export interface ExpedienteExtra extends ExpedientePayload {
  historyId: number
  patientId?: number
  origin: VisitOrigin
  createdAt: string
  updatedAt: string
}
