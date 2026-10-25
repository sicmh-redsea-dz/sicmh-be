import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { getTableConfig } from 'drizzle-orm/mysql-core'
import { TenantContext } from '../infrastructure/database/TenantContext'
import { MysqlVisitsRepository } from '../infrastructure/repositories/mysql-visits.repository'

test('doctor catalog reads staff_members and preserves records beyond the first 20', async () => {
  const rows = Array.from({ length: 25 }, (_, index) => ({
    id: randomUUID(), firstName: `Doctor ${index}`, lastName: 'Test', specialty: null, userId: null,
  }))
  const query = {
    from: (table: any) => {
      assert.equal(getTableConfig(table).name, 'staff_members')
      return query
    },
    where: () => query,
    orderBy: () => query,
    limit: async (limit: number) => rows.slice(0, limit),
    then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
  }
  const original = TenantContext.getDb
  ;(TenantContext as any).getDb = () => ({ select: () => query })
  try {
    const doctors = await new MysqlVisitsRepository().findDoctors('')
    assert.equal(doctors.length, 25)
    assert.equal(doctors[24].PersonalID, rows[24].id)
    assert.equal(doctors[24].NombrePersonal, 'Doctor 24 Test')
  } finally {
    TenantContext.getDb = original
  }
})
