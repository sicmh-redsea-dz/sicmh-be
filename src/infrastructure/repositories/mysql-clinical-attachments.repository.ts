import { randomUUID } from 'crypto'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { ClinicalAttachmentsRepository, CreateAttachmentParams } from '../../application/ports/clinical-attachments.repository'
import { ClinicalAttachment } from '../../domain/entities/ClinicalAttachment'
import { TenantContext } from '../database/TenantContext'
import { clinicalAttachmentAccessLogs, clinicalAttachments } from '../database/schema'

const legacyAttachment = (row: typeof clinicalAttachments.$inferSelect): ClinicalAttachment => ({
  id: row.id,
  patient_id: row.patientId,
  record_id: row.clinicalEncounterId,
  label: row.label,
  source: row.source,
  gcs_object_path: row.objectPath,
  mime_type: row.mimeType,
  size_bytes: row.sizeBytes,
  uploaded_by: row.uploadedBy,
  created_at: row.createdAt.toISOString(),
  deleted_at: row.deletedAt?.toISOString() ?? null,
})

export class MysqlClinicalAttachmentsRepository implements ClinicalAttachmentsRepository {
  async create(params: CreateAttachmentParams): Promise<string> {
    const id = randomUUID()
    await TenantContext.getDb().insert(clinicalAttachments).values({
      id,
      patientId: params.patientId,
      clinicalEncounterId: params.recordId,
      label: params.label,
      source: params.source,
      objectPath: params.gcsObjectPath,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      uploadedBy: params.uploadedBy,
    })
    return id
  }

  async findById(id: string): Promise<ClinicalAttachment | null> {
    const [row] = await TenantContext.getDb().select().from(clinicalAttachments)
      .where(and(eq(clinicalAttachments.id, id), isNull(clinicalAttachments.deletedAt))).limit(1)
    return row ? legacyAttachment(row) : null
  }

  async listByPatient(patientId: string, recordId?: string | null): Promise<ClinicalAttachment[]> {
    const filter = recordId
      ? and(
          eq(clinicalAttachments.patientId, patientId),
          eq(clinicalAttachments.clinicalEncounterId, recordId),
          isNull(clinicalAttachments.deletedAt),
        )
      : and(eq(clinicalAttachments.patientId, patientId), isNull(clinicalAttachments.deletedAt))
    const rows = await TenantContext.getDb().select().from(clinicalAttachments)
      .where(filter).orderBy(desc(clinicalAttachments.createdAt))
    return rows.map(legacyAttachment)
  }

  async softDelete(id: string): Promise<void> {
    await TenantContext.getDb().update(clinicalAttachments).set({ deletedAt: new Date() })
      .where(and(eq(clinicalAttachments.id, id), isNull(clinicalAttachments.deletedAt)))
  }

  async logAccess(attachmentId: string, accessedBy: string, ipAddress: string | null): Promise<void> {
    await TenantContext.getDb().insert(clinicalAttachmentAccessLogs).values({
      attachmentId,
      accessedBy,
      accessedAt: new Date(),
      ipAddress,
    })
  }
}
