import {
  CreateDocumentDeliveryParams,
  DocumentDeliveryRepository,
  DocumentDeliveryType,
} from '../ports/document-delivery.repository'

export interface EnqueueDocumentDeliveryParams {
  documentType: DocumentDeliveryType
  sourceId: string | number
  sourceVersion: string | number
  recipientEmail?: string | null
  snapshot: unknown
  sourceObject?: string | null
}

const MINIMAL_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class DocumentDeliveryService {
  constructor(private readonly repository: DocumentDeliveryRepository) {}

  enqueue = async (params: EnqueueDocumentDeliveryParams): Promise<number> => {
    const email = String(params.recipientEmail ?? '').trim().toLowerCase()
    const eligibility = !email
      ? { status: 'skipped' as const, skipReason: 'missing_recipient_email' as const }
      : !MINIMAL_EMAIL.test(email)
        ? { status: 'skipped' as const, skipReason: 'invalid_recipient_email' as const }
        : { status: 'pending' as const, skipReason: null }

    const delivery: CreateDocumentDeliveryParams = {
      documentType: params.documentType,
      sourceId: String(params.sourceId),
      sourceVersion: String(params.sourceVersion),
      recipientEmail: email || null,
      status: eligibility.status,
      skipReason: eligibility.skipReason,
      snapshotJson: JSON.stringify(params.snapshot),
      sourceObject: params.sourceObject ?? null,
    }
    return this.repository.create(delivery)
  }
}
