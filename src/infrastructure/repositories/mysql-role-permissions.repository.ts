import { RolePermissionsRepository } from '../../application/ports/role-permissions.repository'
import { RolePermissionsStore } from '../../domain/entities/AccessControl'
import { Database } from '../database/Database'

export class MysqlRolePermissionsRepository implements RolePermissionsRepository {
  private initialized = false

  private async ensureTable(): Promise<void> {
    if (this.initialized) return
    await Database.query(
      `CREATE TABLE IF NOT EXISTS permiso_rol_overrides (
        rol_key   VARCHAR(50)  NOT NULL PRIMARY KEY,
        grants    JSON         NOT NULL,
        revokes   JSON         NOT NULL,
        updated_at VARCHAR(30) NOT NULL
      )`
    )
    this.initialized = true
  }

  async load(): Promise<RolePermissionsStore> {
    await this.ensureTable()
    const rows = await Database.execute<any[]>(
      'SELECT rol_key, grants, revokes, updated_at FROM permiso_rol_overrides'
    )
    const roles: Record<string, any> = {}
    let latestUpdatedAt = new Date(0).toISOString()
    for (const row of rows) {
      const grants  = typeof row.grants  === 'string' ? JSON.parse(row.grants)  : row.grants
      const revokes = typeof row.revokes === 'string' ? JSON.parse(row.revokes) : row.revokes
      roles[row.rol_key] = { grants, revokes, updatedAt: row.updated_at }
      if (row.updated_at > latestUpdatedAt) latestUpdatedAt = row.updated_at
    }
    return { roles, updatedAt: latestUpdatedAt }
  }

  async save(store: RolePermissionsStore): Promise<void> {
    await this.ensureTable()
    for (const [rolKey, override] of Object.entries(store.roles)) {
      await Database.execute(
        `INSERT INTO permiso_rol_overrides (rol_key, grants, revokes, updated_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           grants     = VALUES(grants),
           revokes    = VALUES(revokes),
           updated_at = VALUES(updated_at)`,
        [
          rolKey,
          JSON.stringify(override.grants  ?? []),
          JSON.stringify(override.revokes ?? []),
          override.updatedAt ?? new Date().toISOString()
        ]
      )
    }
  }
}
