import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emptyClinicalProfile, validateClinicalProfileReview } from '../domain/entities/ClinicalProfile'
import { legacyProfileCandidates } from '../application/services/clinical-profile.service'

test('unknown allergies, no known allergies and recorded allergies remain distinct', () => {
  const data = emptyClinicalProfile()
  assert.equal(validateClinicalProfileReview({ version: 0, data }).data.allergyStatus, 'unknown')
  assert.equal(validateClinicalProfileReview({ version: 1, data: { ...data, allergyStatus: 'none_known' } }).data.allergyStatus, 'none_known')
  assert.throws(() => validateClinicalProfileReview({ version: 1, data: { ...data, allergyStatus: 'recorded' } }))
  assert.throws(() => validateClinicalProfileReview({ version: 1, data: { ...data, allergies: 'Penicilina' } }))
  assert.equal(validateClinicalProfileReview({ version: 1, data: { ...data, allergyStatus: 'recorded', allergies: ' Penicilina ' } }).data.allergies, 'Penicilina')
})

test('profile review rejects malformed payloads and incomplete replacements', () => {
  for (const input of [null, [], {}, { version: -1, data: emptyClinicalProfile() },
    { version: '0', data: emptyClinicalProfile() }, { version: 0, data: {} },
    { version: 0, data: { ...emptyClinicalProfile(), currentMeds: 12 } },
    { version: 0, data: { ...emptyClinicalProfile(), currentMeds: 'a'.repeat(20001) } }]) {
    assert.throws(() => validateClinicalProfileReview(input))
  }
})

test('legacy proposals retain nonempty unique values and expose contradictions without picking a winner', () => {
  const { data, conflicts } = legacyProfileCandidates([
    { familyHst: ' Diabetes ', currentMeds: 'A', allergies: 'Penicilina' },
    { familyHst: '', currentMeds: 'B' }, { familyHst: 'Diabetes', currentMeds: 'B' },
  ])
  assert.equal(data.familyHst, 'Diabetes')
  assert.equal(data.currentMeds, '')
  assert.deepEqual(conflicts.currentMeds, ['A', 'B'])
  assert.equal(data.allergyStatus, 'recorded')
  assert.equal(legacyProfileCandidates([]).data.allergyStatus, 'unknown')
})
