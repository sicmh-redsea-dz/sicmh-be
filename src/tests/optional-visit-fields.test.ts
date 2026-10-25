import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { validationResult } from 'express-validator'
import { validateCreatePatient, validateEditPatient } from '../api/validators/visits.validator'
import { normalizeExpediente, visitDate } from '../application/services/visit-input'

const validate = async (validators: any[], body: Record<string, unknown>, params = {}) => {
  const req = { body, params, query: {}, headers: {} }
  for (const validator of validators) if (validator.run) await validator.run(req)
  return { errors: validationResult(req as any).array(), body: req.body }
}

test('all four care modules accept just doctor and patient plus module metadata', async () => {
  for (const origin of ['visits', 'emergency', 'oroom', 'hospitalization']) {
    const result = await validate(validateCreatePatient, { doctor: randomUUID(), patient: randomUUID(), origin })
    assert.deepEqual(result.errors, [], origin)
  }
})

test('blank/null optional fields are accepted without generating NaN, while zero is preserved', async () => {
  const result = await validate(validateCreatePatient, {
    doctor: randomUUID(), patient: randomUUID(), origin: 'visits', date: '', diagnosis: '',
    pressure: '', treatment: '', BMI: '', temperature: null, weight: '  ', oxygenation: 0,
    expediente: { standard: {}, module: {} },
  })
  assert.deepEqual(result.errors, [])
  for (const field of ['date', 'BMI', 'temperature', 'weight']) assert.equal(result.body[field], undefined)
  assert.equal(result.body.oxygenation, 0)
})

test('missing or invalid doctor/patient and malformed supplied data remain invalid', async () => {
  const base = { doctor: randomUUID(), patient: randomUUID(), origin: 'visits' }
  for (const change of [{ doctor: '' }, { patient: '123' }, { date: 'invalid' },
    { weight: 'not-a-number' }, { expediente: [] }]) {
    assert.ok((await validate(validateCreatePatient, { ...base, ...change })).errors.length > 0)
  }
})

test('partial edits retain existing identity and allow omitted optional fields', async () => {
  assert.deepEqual((await validate(validateEditPatient, { notes: 'Follow up' }, { id: randomUUID() })).errors, [])
})

test('missing, null and empty expediente do not manufacture an empty clinical record', () => {
  assert.equal(normalizeExpediente(undefined), undefined)
  assert.equal(normalizeExpediente(null), undefined)
  assert.equal(normalizeExpediente({}), undefined)
  assert.equal(normalizeExpediente({ standard: { chiefComplaint: '', physicalExam: '' }, module: {} }), undefined)
})

test('partial expediente supports each module and preserves existing clinical text on edit', () => {
  for (const module of [{ triageLevel: 'III' }, { procedure: 'Procedure' }, { admissionReason: 'Observation' }]) {
    const normalized = normalizeExpediente({ module })!
    assert.deepEqual(normalized.standard, { chiefComplaint: '', currentIllness: '', physicalExam: '' })
    assert.deepEqual(normalized.module, module)
  }
  const existing = { standard: { chiefComplaint: 'Pain', currentIllness: 'History', physicalExam: 'Exam' },
    module: { arrivalMode: 'Walking' } }
  const updated = normalizeExpediente({ module: { triageLevel: 'III' } }, existing)!
  assert.deepEqual(updated.standard, existing.standard)
  assert.deepEqual(updated.module, { arrivalMode: 'Walking', triageLevel: 'III' })
  assert.throws(() => normalizeExpediente({ standard: { chiefComplaint: 123 as any } }))
})

test('new visits receive a real current date when date is omitted or blank', () => {
  const before = Date.now()
  for (const value of [undefined, null, '', '   ']) {
    const date = new Date(visitDate(value)).getTime()
    assert.ok(date >= before && date <= Date.now())
  }
  assert.equal(visitDate('2026-10-23'), '2026-10-23')
  assert.throws(() => visitDate('invalid'))
})
