import { eq } from 'drizzle-orm'
import { TenantContext } from '../../infrastructure/database/TenantContext'
import { documentDeliveries } from '../../infrastructure/database/schema/tenant'

export type DocumentDeliveryInput = Pick<typeof documentDeliveries.$inferInsert,
  'documentType' | 'channel' | 'actorId' | 'attachmentId' | 'consentInstanceId' | 'templateVersionId' | 'contentSha256' | 'ipAddress'>

export class DocumentDeliveriesService {
  async start(input: DocumentDeliveryInput) {
    const db = TenantContext.getDb()
    const [created] = await db.insert(documentDeliveries).values(input).$returningId()
    return async (completed: boolean, httpStatus: number) => {
      await db.update(documentDeliveries).set({
        status: completed ? 'completed' : 'failed',
        httpStatus,
        completedAt: new Date(),
      }).where(eq(documentDeliveries.id, created.id))
    }
  }
}
