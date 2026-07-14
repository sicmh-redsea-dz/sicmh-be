import { ResultSetHeader } from 'mysql2'
import { ClinicalAttachmentsRepository, CreateAttachmentParams } from '../../application/ports/clinical-attachments.repository'
import { ClinicalAttachment } from '../../domain/entities/ClinicalAttachment'
import { Database } from '../database/Database'
import { clinicalAttachmentsQueries } from '../database/queries/clinical-attachments.queries'

export class MysqlClinicalAttachmentsRepository implements ClinicalAttachmentsRepository {
  async create(p: CreateAttachmentParams): Promise<number> {
    const result = await Database.execute<ResultSetHeader>(clinicalAttachmentsQueries('create'), [
      p.patientId,
      p.recordId ?? null,
      p.label,
      p.source,
      p.gcsObjectPath,
      p.mimeType,
      p.sizeBytes,
      p.uploadedBy,
    ])
    return result.insertId
  }

  async findById(id: number): Promise<ClinicalAttachment | null> {
    const rows = await Database.execute<ClinicalAttachment[]>(clinicalAttachmentsQueries('find-by-id'), [id])
    return rows[0] ?? null
  }

  async listByPatient(patientId: number, recordId?: number | null): Promise<ClinicalAttachment[]> {
    if (recordId) {
      return Database.execute<ClinicalAttachment[]>(clinicalAttachmentsQueries('list-by-patient-record'), [patientId, recordId])
    }
    return Database.execute<ClinicalAttachment[]>(clinicalAttachmentsQueries('list-by-patient'), [patientId])
  }

  async softDelete(id: number): Promise<void> {
    await Database.execute(clinicalAttachmentsQueries('soft-delete'), [id])
  }

  async logAccess(attachmentId: number, accessedBy: number, ipAddress: string | null): Promise<void> {
    await Database.execute(clinicalAttachmentsQueries('log-access'), [attachmentId, accessedBy, ipAddress])
  }
}
