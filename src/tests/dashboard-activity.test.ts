import assert from 'node:assert/strict'
import { test } from 'node:test'
import { drizzle } from 'drizzle-orm/mysql-proxy'
import { TenantContext } from '../infrastructure/database/TenantContext'
import { MysqlDashboardRepository } from '../infrastructure/repositories/mysql-dashboard.repository'

test('daily dashboard counts fill missing days and use bounded, tenant-scoped aggregate queries', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 1, 3, 12) })
  const queries: string[] = []
  const db = drizzle(async (query, params) => {
    queries.push(query)
    assert.match(query, /deleted_at.*is null/)
    assert.match(query, /group by DATE_FORMAT/)
    assert.match(query, />= \?/)
    assert.match(query, /< \?/)
    assert.equal(params.length, 2)
    return { rows: query.includes('clinical_encounters') ? [['2026-02-02', 3]] : [['2026-02-01', 2], ['2026-02-03', 1]] }
  })
  const original = TenantContext.getDb
  ;(TenantContext as any).getDb = () => db
  try {
    const rows = await new MysqlDashboardRepository().fetchDailyActivity()
    assert.deepEqual(rows, [
      { date: '2026-02-01', visits: 0, newPatients: 2 },
      { date: '2026-02-02', visits: 3, newPatients: 0 },
      { date: '2026-02-03', visits: 0, newPatients: 1 },
    ])
    assert.equal(queries.length, 2)
  } finally { TenantContext.getDb = original }
})

test('empty daily dashboard history still returns a zero series on the first day', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 2, 1, 12) })
  const db = drizzle(async () => ({ rows: [] }))
  const original = TenantContext.getDb
  ;(TenantContext as any).getDb = () => db
  try {
    assert.deepEqual(await new MysqlDashboardRepository().fetchDailyActivity(), [
      { date: '2026-03-01', visits: 0, newPatients: 0 },
    ])
  } finally { TenantContext.getDb = original }
})
