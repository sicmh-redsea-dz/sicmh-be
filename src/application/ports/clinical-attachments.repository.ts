import { AttachmentSource, ClinicalAttachment } from '../../domain/entities/ClinicalAttachment'

export interface CreateAttachmentParams {
  patientId: number
  recordId: number | null
  label: string
  source: AttachmentSource
  gcsObjectPath: string
  mimeType: string
  sizeBytes: number
  uploadedBy: number
}

export interface ClinicalAttachmentsRepository {
  create(params: CreateAttachmentParams): Promise<number>
  findById(id: number): Promise<ClinicalAttachment | null>
  listByPatient(patientId: number, recordId?: number | null): Promise<ClinicalAttachment[]>
  softDelete(id: number): Promise<void>
  logAccess(attachmentId: number, accessedBy: number, ipAddress: string | null): Promise<void>
}
