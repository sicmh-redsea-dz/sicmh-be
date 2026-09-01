import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { Database } from '../infrastructure/database/Database'
import { toMysqlDatetime } from '../infrastructure/database/mysql-datetime'
import { MysqlConsentsRepository } from '../infrastructure/repositories/mysql-consents.repository'

const originalExecute = Database.execute

afterEach(() => {
  Database.execute = originalExecute
})

describe('MySQL consent datetimes', () => {
  test('formats ISO instants as UTC MySQL DATETIME values', () => {
    assert.equal(toMysqlDatetime('2026-09-01T20:53:31.053Z'), '2026-09-01 20:53:31')
    assert.equal(toMysqlDatetime('2026-09-01T14:53:31-06:00'), '2026-09-01 20:53:31')
  })

  test('rejects invalid datetime values before executing SQL', () => {
    assert.throws(() => toMysqlDatetime('not-a-date'), /Invalid datetime value/)
  })

  test('formats acceptedAt when creating an electronic consent', async () => {
    let values: any[] | undefined
    Database.execute = async (_query: string, parameters?: any[]) => {
      values = parameters
      return { insertId: 17 } as any
    }

    const id = await new MysqlConsentsRepository().createInstance({
      templateId: 1,
      templateVersionId: 2,
      patientId: 3,
      recordId: 4,
      doctorId: 5,
      status: 'accepted',
      snapshotJson: '{}',
      createdBy: 6,
      acceptedAt: '2026-09-01T20:53:31.053Z',
    })

    assert.equal(id, 17)
    assert.equal(values?.[20], '2026-09-01 20:53:31')
  })

  test('formats acceptedAt when accepting a physical consent', async () => {
    let values: any[] | undefined
    Database.execute = async (_query: string, parameters?: any[]) => {
      values = parameters
      return { affectedRows: 1 } as any
    }

    await new MysqlConsentsRepository().acceptPhysicalInstance({
      id: 1,
      attachmentId: 2,
      documentHash: 'hash',
      acceptedBy: 3,
      acceptedAt: '2026-09-01T20:53:31.053Z',
      snapshotJson: '{}',
    })

    assert.equal(values?.[3], '2026-09-01 20:53:31')
  })
})
