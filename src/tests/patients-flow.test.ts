import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { describe, test } from 'node:test'
import { validateGetPatient, validatePatchPatient } from '../api/validators/patients.validator'
import { TenantContext } from '../infrastructure/database/TenantContext'
import { MysqlPatientsRepository } from '../infrastructure/repositories/mysql-patients.repository'

const runMiddlewares = async (middlewares: any[], req: Record<string, unknown>) => {
  const res = {}
  for (const middleware of middlewares) {
    if (typeof middleware?.run === 'function') {
      await middleware.run(req)
      continue
    }
    const error = await new Promise<unknown>((resolve) => {
      middleware(req, res, (err?: unknown) => resolve(err))
    })
    if (error) return error
  }
  return undefined
}

describe('patient validators', () => {
  test('accept patch requests with UUID route ids and optional identification updates', async () => {
    const error = await runMiddlewares(validatePatchPatient, {
      params: { id: randomUUID() },
      body: { id: '0801199912345' },
    })
    assert.equal(error, undefined)
  })

  test('reject non-UUID patient route ids', async () => {
    const error: any = await runMiddlewares(validateGetPatient, {
      params: { id: '123' },
      body: {},
    })
    assert.equal(error?.name, 'validation_errors')
    assert.ok(error.errors.some((entry: { msg: string }) => entry.msg.includes('valid UUID')))
  })
})

describe('MysqlPatientsRepository.update', () => {
  test('persists identification changes when present in the payload', async () => {
    const repo = new MysqlPatientsRepository()
    const originalGetDb = (TenantContext as any).getDb
    let capturedSet: Record<string, unknown> | undefined

    ;(TenantContext as any).getDb = () => ({
      update: () => ({
        set: (values: Record<string, unknown>) => {
          capturedSet = values
          return {
            where: async () => [{ affectedRows: 1 }],
          }
        },
      }),
    })

    try {
      const affectedRows = await repo.update(randomUUID(), { id: '0801199912345' })
      assert.equal(affectedRows, 1)
      assert.equal(capturedSet?.identification, '0801199912345')
    } finally {
      ;(TenantContext as any).getDb = originalGetDb
    }
  })
})
