import { Pool } from 'mysql2/promise'
import { UserPermissionsRepository } from '../../application/ports/user-permissions.repository'
import { UserPermissionsStore } from '../../domain/entities/AccessControl'
import { Database } from '../database/Database'
import { TenantContext } from '../database/TenantContext'

export class MysqlUserPermissionsRepository implements UserPermissionsRepository {
  // Tracks which tenant pools have already had the table ensured — this repo
  // is a process-wide singleton but each tenant has its own schema/pool, so a
  // single boolean would only ever create the table in the first tenant hit.
  private readonly ensuredPools = new Set<Pool>()

  private async ensureTable(): Promise<void> {
    const pool = TenantContext.getPool()
    if (this.ensuredPools.has(pool)) return
    await Database.query(
      `CREATE TABLE IF NOT EXISTS permiso_usuario_overrides (
        usuario_id  INT          NOT NULL PRIMARY KEY,
        grants      JSON         NOT NULL,
        revokes     JSON         NOT NULL,
        updated_at  VARCHAR(30)  NOT NULL
      )`
    )
    this.ensuredPools.add(pool)
  }

  async load(): Promise<UserPermissionsStore> {
    await this.ensureTable()
    const rows = await Database.execute<any[]>(
      'SELECT usuario_id, grants, revokes, updated_at FROM permiso_usuario_overrides'
    )
    const users = rows.map((row) => ({
      userId:    row.usuario_id,
      grants:    typeof row.grants  === 'string' ? JSON.parse(row.grants)  : row.grants,
      revokes:   typeof row.revokes === 'string' ? JSON.parse(row.revokes) : row.revokes,
      updatedAt: row.updated_at
    }))
    const latestUpdatedAt = users.reduce(
      (acc, u) => (u.updatedAt > acc ? u.updatedAt : acc),
      new Date(0).toISOString()
    )
    return { users, updatedAt: latestUpdatedAt }
  }

  async save(store: UserPermissionsStore): Promise<void> {
    await this.ensureTable()
    for (const u of store.users) {
      await Database.execute(
        `INSERT INTO permiso_usuario_overrides (usuario_id, grants, revokes, updated_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           grants     = VALUES(grants),
           revokes    = VALUES(revokes),
           updated_at = VALUES(updated_at)`,
        [
          u.userId,
          JSON.stringify(u.grants  ?? []),
          JSON.stringify(u.revokes ?? []),
          u.updatedAt ?? new Date().toISOString()
        ]
      )
    }
  }
}
