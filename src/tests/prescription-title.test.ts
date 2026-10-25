import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ClinicalDocumentsService } from '../application/services/clinical-documents.service'
import { TenantContext } from '../infrastructure/database/TenantContext'

test('prescriptions use the linked doctor profile title and handle unconfigured profiles', async () => {
  const original = TenantContext.getDb
  try {
    for (const [gender, title] of [['female', 'Dra.'], ['male', 'Dr.'], ['unspecified', ''], [undefined, '']]) {
      const query: any = { select: () => query, from: () => query, where: () => query,
        limit: async () => gender === undefined ? [] : [{ gender }] }
      TenantContext.getDb = () => query
      const service = new ClinicalDocumentsService({} as any, {} as any)
      Object.assign(service, {
        loadVisitRecord: async () => ({ encounter: { id: 'visit', occurredAt: new Date() },
          patient: { id: 'patient', firstName: 'Patient', lastName: 'Test' },
          staff: { id: 'doctor', userId: 'doctor-user', firstName: 'Doctor', lastName: 'Test' } }),
        getClinicName: async () => 'Clinic',
        loadDoctorAssets: async () => ({ signatureUrl: null, stampUrl: null }),
      })
      const result = await service.getPrescription('visit', 'TEST')
      assert.equal(result.doctorTitle, title)
      assert.equal(result.doctorName, 'Doctor Test')
    }
  } finally { TenantContext.getDb = original }
})
