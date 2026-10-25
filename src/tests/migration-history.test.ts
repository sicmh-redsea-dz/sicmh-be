import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { assertTenantMigrationHistory } from '../infrastructure/database/migration-history'

test('migration preflight accepts either checkout line ending and rejects changed SQL or timestamps', async () => {
  const journal = JSON.parse(readFileSync('drizzle/tenant/meta/_journal.json', 'utf8'))
  const first = journal.entries[0]
  const sql = readFileSync(`drizzle/tenant/${first.tag}.sql`, 'utf8').replace(/\r\n/g, '\n')
  const pool = (hash: string, timestamp = first.when) => ({ query: async (query: string) => [
    query.includes('information_schema') ? [{ TABLE_NAME: '__drizzle_migrations' }] : [{ hash, created_at: timestamp }],
  ] }) as any
  const hash = (content: string) => createHash('sha256').update(content).digest('hex')
  await assertTenantMigrationHistory(pool(hash(sql)))
  await assertTenantMigrationHistory(pool(hash(sql.replace(/\n/g, '\r\n'))))
  await assert.rejects(assertTenantMigrationHistory(pool(hash(`${sql}\nALTER TABLE patients DROP COLUMN phone;`))), /Divergent/)
  await assert.rejects(assertTenantMigrationHistory(pool(hash(sql), first.when + 1)), /Divergent/)
})
