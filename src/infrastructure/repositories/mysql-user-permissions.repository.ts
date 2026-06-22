import { UserPermissionsRepository } from '../../application/ports/user-permissions.repository'
import { UserPermissionsStore } from '../../domain/entities/AccessControl'
import { Database } from '../database/Database'

export class MysqlUserPermissionsRepository implements UserPermissionsRepository {
  private initialized = false

  private async ensureTable(): Promise<void> {
    if (this.initialized) return
    await Database.query(
      `CREATE TABLE IF NOT EXISTS permiso_usuario_overrides (
        usuario_id  INT          NOT NULL PRIMARY KEY,
        grants      JSON         NOT NULL,
        revokes     JSON         NOT NULL,
        updated_at  VARCHAR(30)  NOT NULL
      )`
    )
    this.initialized = true
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
