export type DocumentDeliveryType = 'invoice' | 'receipt' | 'consent'
export type InitialDocumentDeliveryStatus = 'pending' | 'skipped'

export interface CreateDocumentDeliveryParams {
  documentType: DocumentDeliveryType
  sourceId: string
  sourceVersion: string
  recipientEmail: string | null
  status: InitialDocumentDeliveryStatus
  skipReason: 'missing_recipient_email' | 'invalid_recipient_email' | null
  snapshotJson: string
  sourceObject?: string | null
}

export interface DocumentDeliveryRepository {
  create(params: CreateDocumentDeliveryParams): Promise<number>
}
