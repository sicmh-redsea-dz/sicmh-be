import { NextFunction, Request, Response } from 'express'
import { TenantContext } from '../../infrastructure/database/TenantContext'
import { auditLogs } from '../../infrastructure/database/schema/tenant'
import { TokenPayload } from '../../utils/jwtUtils'

const targets: Record<string, string> = {
  patients: 'patients', visits: 'clinical_encounters', beds: 'beds', 'or-rooms': 'operating_rooms',
  invoice: 'invoices', billing: 'billing_ledger_entries', scheduling: 'appointments',
  inventory: 'products', attachments: 'clinical_attachments', profile: 'user_profiles',
  company: 'companies', users: 'users', roles: 'roles', consents: 'consent_templates',
  'invoice-number-sequences': 'invoice_number_sequences',
}

export const auditRequestTarget = (method: string, originalUrl: string) => {
  // Never record query values, request bodies, tokens or clinical payloads.
  const segments = originalUrl.split('?')[0].split('/').filter(Boolean)
  const resourceIndex = segments[1] === 'settings' ? 2 : 1
  const resource = segments[resourceIndex] ?? 'dashboard'
  const candidateId = segments[resourceIndex + 1]
  const recordId = candidateId && /^[0-9a-f-]{18,36}$/i.test(candidateId) ? candidateId : null
  const action: typeof auditLogs.$inferInsert['action'] = method === 'DELETE' ? 'delete'
    : ['PUT', 'PATCH'].includes(method) ? 'update'
    : method === 'POST' && !segments.some((value) => value === 'print' || value === 'pdf') ? 'create' : 'view'
  return { targetTable: targets[resource] ?? resource.slice(0, 100), recordId, action }
}

export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const db = TenantContext.getDb()
  const user = (req as Request & { user: TokenPayload }).user
  const target = auditRequestTarget(req.method, req.originalUrl)
  res.once('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 400) return
    void db.insert(auditLogs).values({
      ...target,
      recordId: res.locals.auditRecordId ?? target.recordId,
      actorId: user.uid,
      occurredAt: new Date(),
      ipAddress: req.ip,
      details: { method: req.method, statusCode: res.statusCode, scope: 'http_request' },
    }).catch((error: unknown) => console.error('[audit] Failed to record request', error))
  })
  next()
}
