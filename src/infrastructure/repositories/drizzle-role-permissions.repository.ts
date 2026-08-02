import { and, eq, isNull } from 'drizzle-orm'
import { RolePermissionsRepository } from '../../application/ports/role-permissions.repository'
import { RolePermissionsStore } from '../../domain/entities/AccessControl'
import { TenantContext } from '../database/TenantContext'
import { permissions, rolePermissions, roles } from '../database/schema/tenant'

export class DrizzleRolePermissionsRepository implements RolePermissionsRepository {
  async load(): Promise<RolePermissionsStore> {
    const rows = await TenantContext.getDb()
      .select({
        roleKey: roles.key,
        permissionKey: permissions.key,
        effect: rolePermissions.effect,
        updatedAt: rolePermissions.updatedAt,
      })
      .from(rolePermissions)
      .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(and(
        isNull(rolePermissions.deletedAt),
        isNull(roles.deletedAt),
        isNull(permissions.deletedAt),
      ))

    const store: RolePermissionsStore = { roles: {}, updatedAt: new Date(0).toISOString() }
    for (const row of rows) {
      const override = store.roles[row.roleKey] ?? { grants: [], revokes: [] }
      if (row.effect === 'grant') override.grants.push(row.permissionKey)
      else override.revokes.push(row.permissionKey)
      override.updatedAt = row.updatedAt.toISOString()
      store.roles[row.roleKey] = override
      if (row.updatedAt.toISOString() > store.updatedAt) store.updatedAt = row.updatedAt.toISOString()
    }
    return store
  }

  async save(store: RolePermissionsStore): Promise<void> {
    const db = TenantContext.getDb()
    const roleRows = await db.select().from(roles).where(isNull(roles.deletedAt))
    const permissionRows = await db.select().from(permissions).where(isNull(permissions.deletedAt))
    const permissionByKey = new Map(permissionRows.map((permission) => [permission.key, permission.id]))

    for (const [roleKey, override] of Object.entries(store.roles)) {
      const role = roleRows.find((candidate) => candidate.key === roleKey)
      if (!role) continue
      await db
        .update(rolePermissions)
        .set({ deletedAt: new Date() })
        .where(and(eq(rolePermissions.roleId, role.id), isNull(rolePermissions.deletedAt)))

      for (const [effect, keys] of [['grant', override.grants], ['revoke', override.revokes]] as const) {
        for (const key of keys ?? []) {
          const permissionId = permissionByKey.get(key)
          if (!permissionId) continue
          await db
            .insert(rolePermissions)
            .values({ roleId: role.id, permissionId, effect })
            .onDuplicateKeyUpdate({ set: { effect, deletedAt: null } })
        }
      }
    }
  }
}
