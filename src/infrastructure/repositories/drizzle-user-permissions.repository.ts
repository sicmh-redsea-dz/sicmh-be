import { and, eq, isNull } from 'drizzle-orm'
import { UserPermissionsRepository } from '../../application/ports/user-permissions.repository'
import { UserPermissionsStore } from '../../domain/entities/AccessControl'
import { TenantContext } from '../database/TenantContext'
import { permissions, userPermissions } from '../database/schema/tenant'

export class DrizzleUserPermissionsRepository implements UserPermissionsRepository {
  async load(): Promise<UserPermissionsStore> {
    const rows = await TenantContext.getDb()
      .select({
        userId: userPermissions.userId,
        permissionKey: permissions.key,
        effect: userPermissions.effect,
        updatedAt: userPermissions.updatedAt,
      })
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(and(isNull(userPermissions.deletedAt), isNull(permissions.deletedAt)))

    const users = new Map<string, UserPermissionsStore['users'][number]>()
    for (const row of rows) {
      const override = users.get(row.userId) ?? { userId: row.userId, grants: [], revokes: [] }
      if (row.effect === 'grant') override.grants.push(row.permissionKey)
      else override.revokes.push(row.permissionKey)
      override.updatedAt = row.updatedAt.toISOString()
      users.set(row.userId, override)
    }
    const entries = Array.from(users.values())
    const updatedAt = entries.reduce(
      (latest, entry) => entry.updatedAt && entry.updatedAt > latest ? entry.updatedAt : latest,
      new Date(0).toISOString(),
    )
    return { users: entries, updatedAt }
  }

  async save(store: UserPermissionsStore): Promise<void> {
    const db = TenantContext.getDb()
    const permissionRows = await db.select().from(permissions).where(isNull(permissions.deletedAt))
    const permissionByKey = new Map(permissionRows.map((permission) => [permission.key, permission.id]))

    for (const override of store.users) {
      await db
        .update(userPermissions)
        .set({ deletedAt: new Date() })
        .where(and(eq(userPermissions.userId, override.userId), isNull(userPermissions.deletedAt)))

      for (const [effect, keys] of [['grant', override.grants], ['revoke', override.revokes]] as const) {
        for (const key of keys ?? []) {
          const permissionId = permissionByKey.get(key)
          if (!permissionId) continue
          await db
            .insert(userPermissions)
            .values({ userId: override.userId, permissionId, effect })
            .onDuplicateKeyUpdate({ set: { effect, deletedAt: null } })
        }
      }
    }
  }
}
