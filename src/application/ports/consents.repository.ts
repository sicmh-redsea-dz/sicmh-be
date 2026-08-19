import { ConsentInstance, ConsentTemplate } from '../../domain/entities/Consent'

export interface CreateConsentTemplateParams {
  name: string
  content: string
  createdBy: number
}

export interface CreateConsentInstanceParams {
  templateId: number
  templateVersionId: number
  patientId: number
  recordId: number
  doctorId: number
  status: 'printed' | 'accepted'
  acceptanceMethod?: 'checkbox' | 'drawn_signature' | 'physical' | null
  signerType?: 'patient' | 'guardian' | null
  signerName?: string | null
  signerIdentification?: string | null
  signerRelationship?: string | null
  signerPhone?: string | null
  signerEmail?: string | null
  signatureObject?: string | null
  doctorSignatureObject?: string | null
  doctorStampObject?: string | null
  attachmentId?: number | null
  documentHash?: string | null
  snapshotJson: string
  createdBy: number
  acceptedAt?: string | null
}

export interface ConsentsRepository {
  listTemplates(includeInactive?: boolean): Promise<ConsentTemplate[]>
  findTemplate(id: number): Promise<(ConsentTemplate & { version_id: number }) | null>
  createTemplate(params: CreateConsentTemplateParams): Promise<number>
  updateTemplate(id: number, name: string, content: string, updatedBy: number): Promise<void>
  setTemplateActive(id: number, active: boolean): Promise<void>
  getVisitContext(recordId: number): Promise<any | null>
  getDraftContext(patientId: number, doctorId: number): Promise<any | null>
  listByVisit(recordId: number): Promise<ConsentInstance[]>
  createInstance(params: CreateConsentInstanceParams): Promise<number>
  findInstance(id: number): Promise<ConsentInstance | null>
  acceptPhysicalInstance(params: {
    id: number
    attachmentId: number
    documentHash: string
    acceptedBy: number
    acceptedAt: string
    snapshotJson: string
  }): Promise<void>
}
