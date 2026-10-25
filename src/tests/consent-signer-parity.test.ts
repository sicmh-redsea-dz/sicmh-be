import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ClinicalDocumentsService } from '../application/services/clinical-documents.service'

test('minor consent requires a complete guardian; valid guardian and adult patient proceed to rendering', async () => {
  const service = new ClinicalDocumentsService({} as any, {} as any)
  let age = 17
  ;(service as any).getVisitContext = async () => ({ patientAge: age, hasDoctorSignature: true,
    hasDoctorStamp: true, template: { current_version: 1 } })
  ;(service as any).renderConsentHtml = () => { throw new Error('Reached rendering') }
  const accept = (payload: any) => service.acceptVisit('visit', 'template', { expectedTemplateVersion: 1, ...payload }, 'TEST', 'actor')
  await assert.rejects(accept({ signerType: 'patient', signerName: 'Minor' }), (error: any) => error.name === 'validation_errors')
  const complete = { signerType: 'guardian', signerName: 'Guardian', signerIdentification: '123', signerRelationship: 'Mother', signerPhone: '99999999' }
  for (const field of ['signerName', 'signerIdentification', 'signerRelationship', 'signerPhone'])
    await assert.rejects(accept({ ...complete, [field]: ' ' }), (error: any) => error.name === 'validation_errors')
  await assert.rejects(accept(complete), /Reached rendering/)
  age = 30
  await assert.rejects(accept({ signerType: 'patient', signerName: 'Adult' }), /Reached rendering/)
})
