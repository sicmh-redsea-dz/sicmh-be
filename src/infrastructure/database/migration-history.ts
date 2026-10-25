import { readMigrationFiles } from 'drizzle-orm/migrator'
import { Pool, RowDataPacket } from 'mysql2/promise'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Refuse divergent histories before executing any DDL against an existing tenant. */
export async function assertTenantMigrationHistory(pool: Pool, folder = './drizzle/tenant'): Promise<void> {
  const [tables] = await pool.query<RowDataPacket[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '__drizzle_migrations'",
  )
  if (!tables.length) return
  const [applied] = await pool.query<RowDataPacket[]>('SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at, id')
  const expected = readMigrationFiles({ migrationsFolder: folder })
  const journal = JSON.parse(readFileSync(join(folder, 'meta/_journal.json'), 'utf8')) as { entries: { tag: string }[] }
  for (const [index, row] of applied.entries()) {
    const file = journal.entries[index] && readFileSync(join(folder, `${journal.entries[index].tag}.sql`), 'utf8')
    // Git's Windows checkout may use CRLF while Linux builds use LF. Both must
    // identify the same immutable SQL, without accepting different statements.
    const lf = file?.replace(/\r\n/g, '\n')
    const hashes = new Set(lf === undefined ? [] : [lf, lf.replace(/\n/g, '\r\n')]
      .map(sql => createHash('sha256').update(sql).digest('hex')))
    if (!expected[index] || !hashes.has(row.hash) || Number(row.created_at) !== expected[index].folderMillis) {
      throw new Error('Divergent tenant migration history. No migrations were run. Reconcile the local legacy schema with the canonical Beta-v0.0.1 history before deployment; see docs/migrations/README.md.')
    }
  }
}
