import { AttachmentSource, ClinicalAttachment } from '../../domain/entities/ClinicalAttachment'

export interface CreateAttachmentParams {
  patientId: string
  recordId: string | null
  label: string
  source: AttachmentSource
  gcsObjectPath: string
  mimeType: string
  sizeBytes: number
  uploadedBy: string
}

export interface ClinicalAttachmentsRepository {
  create(params: CreateAttachmentParams): Promise<string>
  findById(id: string): Promise<ClinicalAttachment | null>
  listByPatient(patientId: string, recordId?: string | null): Promise<ClinicalAttachment[]>
  softDelete(id: string): Promise<void>
  logAccess(attachmentId: string, accessedBy: string, ipAddress: string | null): Promise<void>
}
