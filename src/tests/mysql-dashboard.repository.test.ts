import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { Database } from '../infrastructure/database/Database'
import { MysqlDashboardRepository } from '../infrastructure/repositories/mysql-dashboard.repository'

const originalExecute = Database.execute

afterEach(() => {
  Database.execute = originalExecute
})

describe('MysqlDashboardRepository', () => {
  test('returns null when the tenant dashboard function does not exist', async () => {
    Database.execute = async () => {
      throw { code: 'ER_SP_DOES_NOT_EXIST' }
    }

    const repository = new MysqlDashboardRepository()

    assert.equal(await repository.fetchCardData(), null)
  })

  test('does not hide other database errors', async () => {
    const databaseError = { code: 'ER_BAD_DB_ERROR' }
    Database.execute = async () => {
      throw databaseError
    }

    const repository = new MysqlDashboardRepository()

    await assert.rejects(repository.fetchCardData(), error => error === databaseError)
  })
})
