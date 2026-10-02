import { Request, Response } from 'express'
import { DocumentDeliveriesService, DocumentDeliveryInput } from '../../application/services/document-deliveries.service'
import { TokenPayload } from '../../utils/jwtUtils'

export const trackDocumentDelivery = async (req: Request, res: Response, input: DocumentDeliveryInput) => {
  const user = (req as Request & { user: TokenPayload }).user
  const complete = await new DocumentDeliveriesService().start({ ...input, actorId: user.uid, ipAddress: req.ip })
  let recorded = false
  const finish = (completed: boolean) => {
    if (recorded) return
    recorded = true
    void complete(completed && res.statusCode >= 200 && res.statusCode < 300, res.statusCode)
      .catch((error: unknown) => console.error('[document-delivery] Failed to record outcome', error))
  }
  res.once('finish', () => finish(true))
  res.once('close', () => finish(res.writableFinished))
  // The client may disconnect while the initial database insert is pending.
  if (res.destroyed) finish(false)
}
