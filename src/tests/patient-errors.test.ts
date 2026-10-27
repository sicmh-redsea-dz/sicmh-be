import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PatientsService } from '../application/services/patients.service'
import { errorHandler } from '../api/middlewares/errorHandler'

test('patient creates and updates translate raw and wrapped duplicate errors to actionable conflicts', async () => {
  for (const failure of [{ code: 'ER_DUP_ENTRY' }, { cause: { cause: { code: 'ER_DUP_ENTRY' } } }]) {
    const service = new PatientsService({
      create: async () => { throw failure }, update: async () => { throw failure },
      findById: async () => ({ Identificacion: '0801199912345' }),
    } as any)
    for (const operation of [() => service.insertPatient({ id: '0801199912345' } as any),
      () => service.updatedPatient({ id: '0801199912345' }, 'patient-id')]) {
      await assert.rejects(operation(), (error: any) => {
        let status: number | undefined
        let body: any
        errorHandler(error, { status: (value: number) => { status = value; return { json: (value: any) => { body = value } } } } as any, () => {})
        assert.equal(status, 409)
        assert.equal(body.code, 'PATIENT_IDENTIFICATION_EXISTS')
        assert.equal(body.field, 'id')
        assert.match(body.message, /número de identificación/)
        assert.doesNotMatch(body.message, /SQL|undefined|Duplicated entry/)
        return true
      })
    }
  }
})

test('unexpected patient storage failures are preserved', async () => {
  const failure = new Error('storage unavailable')
  const service = new PatientsService({ create: async () => { throw failure }, update: async () => { throw failure } } as any)
  await assert.rejects(service.insertPatient({ id: '0801199912345' } as any), error => error === failure)
  await assert.rejects(service.updatedPatient({ firstName: 'Test' }, 'patient-id'), error => error === failure)
})
