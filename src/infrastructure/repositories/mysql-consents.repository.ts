import { ResultSetHeader } from 'mysql2'
import { ConsentsRepository, CreateConsentInstanceParams, CreateConsentTemplateParams } from '../../application/ports/consents.repository'
import { ConsentInstance, ConsentTemplate } from '../../domain/entities/Consent'
import { Database } from '../database/Database'
import { consentsQueries } from '../database/queries/consents.queries'

export class MysqlConsentsRepository implements ConsentsRepository {
  listTemplates(includeInactive = false): Promise<ConsentTemplate[]> {
    return Database.execute(consentsQueries('list-templates'), [includeInactive ? 1 : 0])
  }

  async findTemplate(id: number): Promise<(ConsentTemplate & { version_id: number }) | null> {
    const rows = await Database.execute<Array<ConsentTemplate & { version_id: number }>>(consentsQueries('find-template'), [id])
    return rows[0] ?? null
  }

  async createTemplate(params: CreateConsentTemplateParams): Promise<number> {
    return Database.transaction(async () => {
      const result = await Database.execute<ResultSetHeader>(consentsQueries('create-template'), [params.name, params.createdBy])
      await Database.execute(consentsQueries('create-version'), [result.insertId, 1, params.content, params.createdBy])
      return result.insertId
    })
  }

  async updateTemplate(id: number, name: string, content: string, updatedBy: number): Promise<void> {
    await Database.transaction(async () => {
      const current = await this.findTemplate(id)
      if (!current) throw Object.assign(new Error('Plantilla de consentimiento no encontrada.'), { name: 'not_found_error' })
      const nextVersion = Number(current.current_version) + 1
      await Database.execute(consentsQueries('create-version'), [id, nextVersion, content, updatedBy])
      await Database.execute(consentsQueries('update-template'), [name, nextVersion, id])
    })
  }

  async setTemplateActive(id: number, active: boolean): Promise<void> {
    await Database.execute(consentsQueries('set-active'), [active ? 1 : 0, id])
  }

  async getVisitContext(recordId: number): Promise<any | null> {
    const rows = await Database.execute<any[]>(consentsQueries('visit-context'), [recordId])
    return rows[0] ?? null
  }

  async getDraftContext(patientId: number, doctorId: number): Promise<any | null> {
    const rows = await Database.execute<any[]>(consentsQueries('draft-context'), [patientId, doctorId])
    return rows[0] ?? null
  }

  listByVisit(recordId: number): Promise<ConsentInstance[]> {
    return Database.execute(consentsQueries('list-by-visit'), [recordId])
  }

  async createInstance(p: CreateConsentInstanceParams): Promise<number> {
    const values = [
      p.templateId, p.templateVersionId, p.patientId, p.recordId, p.doctorId,
      p.status, p.acceptanceMethod ?? null, p.signerType ?? null, p.signerName ?? null,
      p.signerIdentification ?? null, p.signerRelationship ?? null, p.signerPhone ?? null,
      p.attachmentId ?? null, p.documentHash ?? null, p.snapshotJson, p.createdBy,
      p.status, p.templateId,
    ]
    const result = await Database.execute<ResultSetHeader>(consentsQueries('create-instance'), values)
    return result.insertId
  }

  async findInstance(id: number): Promise<ConsentInstance | null> {
    const rows = await Database.execute<ConsentInstance[]>(consentsQueries('find-instance'), [id])
    return rows[0] ?? null
  }

  async acceptPhysicalInstance(id: number, attachmentId: number, documentHash: string, acceptedBy: number): Promise<void> {
    const result = await Database.execute<ResultSetHeader>(consentsQueries('accept-physical'), [attachmentId, documentHash, acceptedBy, id])
    if (!result.affectedRows) throw Object.assign(new Error('El consentimiento impreso no está pendiente.'), { name: 'validation_errors', errors: [{ msg: 'El consentimiento impreso no está pendiente.' }] })
  }
}
