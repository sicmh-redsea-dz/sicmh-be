import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { describe, test } from 'node:test'
import { validateGetPatient, validatePatchPatient, validatePostPatient } from '../api/validators/patients.validator'
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


describe('patient document and contact formats', () => {
  const base = { birthdate: '2000-01-01', firstName: 'Test', lastName: 'Patient', gender: 'other', phone: '', email: '', address: '' }
  test('accepts each document format and optional patient contact details', async () => {
    for (const [identificationType, id] of [['identidad', '0801199912345'], ['carne_residencia', '1234567890123456789'], ['pasaporte', 'AB12345']]) {
      assert.equal(await runMiddlewares(validatePostPatient, { body: { ...base, identificationType, id } }), undefined)
    }
  })
  test('rejects malformed documents', async () => {
    for (const change of [
      { identificationType: 'identidad', id: '080119991234' }, { identificationType: 'identidad', id: 'A801199912345' },
      { identificationType: 'carne_residencia', id: '12345678901234567890' }, { identificationType: 'carne_residencia', id: 'AB1234' },
      { identificationType: 'pasaporte', id: 'AB-1234' },
    ]) {
      const error: any = await runMiddlewares(validatePostPatient, { body: { ...base, ...change } })
      assert.equal(error?.name, 'validation_errors', JSON.stringify(change))
    }
  })
})


test('patient creation accepts omitted optional fields, blank email and partial emergency contact', async () => {
  const required = { birthdate: '2000-01-01', firstName: 'Test', lastName: 'Patient', gender: 'other', id: '0801199912345' }
  for (const extra of [{}, { email: '' }, { email: '   ' }, { emergencyContact: { phone: '99999999' } }, { address: 'A' }]) {
    assert.equal(await runMiddlewares(validatePostPatient, { body: { ...required, ...extra } }), undefined)
  }
})
