import { TenantContext } from '../infrastructure/database/TenantContext'
import { permissionAuditLogs } from '../infrastructure/database/schema/tenant'

export const auditPermissionChange = (
  actorId: string,
  targetType: 'role' | 'user',
  targetId: string,
  grants: string[],
  revokes: string[],
): void => {
  TenantContext.getDb()
    .insert(permissionAuditLogs)
    .values({ actorId, targetType, targetId, grants, revokes })
    .catch((error: unknown) => console.error('[audit] Failed to write permission audit log', error))
}
