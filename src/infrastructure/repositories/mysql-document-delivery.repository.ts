import { ResultSetHeader } from 'mysql2'
import { CreateDocumentDeliveryParams, DocumentDeliveryRepository } from '../../application/ports/document-delivery.repository'
import { Database } from '../database/Database'
import { insertDocumentDeliveryQuery } from '../database/queries/document-delivery.queries'

export class MysqlDocumentDeliveryRepository implements DocumentDeliveryRepository {
  async create(params: CreateDocumentDeliveryParams): Promise<number> {
    const result = await Database.execute<ResultSetHeader>(insertDocumentDeliveryQuery, [
      params.documentType,
      params.sourceId,
      params.sourceVersion,
      params.recipientEmail,
      params.status,
      params.skipReason,
      params.snapshotJson,
      params.sourceObject ?? null,
    ])
    return result.insertId
  }
}
