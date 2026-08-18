export interface ConsentTemplate {
  id: number
  name: string
  current_version: number
  content: string
  is_active: number
  created_by: number
  created_at: string
  updated_at: string
}

export type ConsentStatus = 'printed' | 'accepted'
export type ConsentAcceptanceMethod = 'checkbox' | 'drawn_signature' | 'physical'

export interface ConsentInstance {
  id: number
  template_id: number
  template_version_id: number
  template_name: string
  template_version: number
  patient_id: number
  record_id: number
  doctor_id: number
  status: ConsentStatus
  acceptance_method: ConsentAcceptanceMethod | null
  signer_type: 'patient' | 'guardian' | null
  signer_name: string | null
  signer_identification: string | null
  signer_relationship: string | null
  signer_phone: string | null
  attachment_id: number | null
  accepted_at: string | null
  created_at: string
}

export interface ConsentDocumentContext {
  visitId: number | null
  visitDate: string
  patientId: number
  patientName: string
  patientBirthDate: string | null
  patientAge: number | null
  patientPhone: string | null
  patientIdentification: string | null
  doctorId: number
  doctorUserId: number | null
  doctorName: string
  clinicName: string
  logoUrl: string
  signatureUrl: string | null
  stampUrl: string | null
  hasDoctorSignature: boolean
  hasDoctorStamp: boolean
  template: ConsentTemplate
}
