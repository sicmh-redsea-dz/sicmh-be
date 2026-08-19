import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { DocumentDeliveryService } from '../application/services/document-delivery.service'
import { CreateDocumentDeliveryParams, DocumentDeliveryRepository } from '../application/ports/document-delivery.repository'
import { insertDocumentDeliveryQuery } from '../infrastructure/database/queries/document-delivery.queries'
import { InvoiceService } from '../application/services/invoice.service'
import { Database } from '../infrastructure/database/Database'
import { PoolManager } from '../infrastructure/database/PoolManager'
import { ConsentsService } from '../application/services/consents.service'
import sharp from 'sharp'

class MemoryDeliveryRepository implements DocumentDeliveryRepository {
  rows = new Map<string, CreateDocumentDeliveryParams & { id: number }>()

  async create(params: CreateDocumentDeliveryParams): Promise<number> {
    const key = `${params.documentType}|${params.sourceId}|${params.sourceVersion}`
    const existing = this.rows.get(key)
    if (existing) return existing.id
    const id = this.rows.size + 1
    this.rows.set(key, { ...params, id })
    return id
  }
}

const originalTransaction = Database.transaction
const originalResolveEmpresa = PoolManager.resolveEmpresa

afterEach(() => {
  Database.transaction = originalTransaction
  PoolManager.resolveEmpresa = originalResolveEmpresa
})

describe('document delivery eligibility and idempotency', () => {
  test('normalizes a valid email and creates a pending delivery', async () => {
    const repo = new MemoryDeliveryRepository()
    await new DocumentDeliveryService(repo).enqueue({
      documentType: 'receipt', sourceId: 'A-1', sourceVersion: '1',
      recipientEmail: '  PATIENT@Example.COM ', snapshot: {},
    })
    const row = [...repo.rows.values()][0]
    assert.equal(row.recipientEmail, 'patient@example.com')
    assert.equal(row.status, 'pending')
    assert.equal(row.skipReason, null)
  })

  test('records missing and invalid emails as skipped', async () => {
    const repo = new MemoryDeliveryRepository()
    const service = new DocumentDeliveryService(repo)
    await service.enqueue({ documentType: 'receipt', sourceId: 'M', sourceVersion: '1', recipientEmail: ' ', snapshot: {} })
    await service.enqueue({ documentType: 'receipt', sourceId: 'I', sourceVersion: '1', recipientEmail: 'not-an-email', snapshot: {} })
    assert.equal(repo.rows.get('receipt|M|1')?.skipReason, 'missing_recipient_email')
    assert.equal(repo.rows.get('receipt|I|1')?.skipReason, 'invalid_recipient_email')
    assert.equal(repo.rows.get('receipt|M|1')?.status, 'skipped')
    assert.equal(repo.rows.get('receipt|I|1')?.status, 'skipped')
  })

  test('repeated enqueue uses the source uniqueness key and the SQL is parameterized', async () => {
    const repo = new MemoryDeliveryRepository()
    const service = new DocumentDeliveryService(repo)
    const request = { documentType: 'invoice' as const, sourceId: 'INV-77', sourceVersion: '1', recipientEmail: 'a@b.com', snapshot: {} }
    assert.equal(await service.enqueue(request), await service.enqueue(request))
    assert.equal(repo.rows.size, 1)
    assert.match(insertDocumentDeliveryQuery, /ON DUPLICATE KEY UPDATE/i)
    assert.equal((insertDocumentDeliveryQuery.match(/\?/g) ?? []).length, 8)
    assert.doesNotMatch(insertDocumentDeliveryQuery, /INV-77|a@b\.com/)
  })
})

const invoiceFixture = (cai: unknown) => ({
  FacturaID: 9, PacienteID: 4, PersonalID: 2, FechaFactura: '2026-08-19 10:00:00',
  Monto: 125, Estado: 'Pendiente', InvoiceNumber: 'ORIGINAL-INV-9', CAI: cai,
  PacienteEmail: ' Patient@Example.com ', PacienteNombre: 'Ada Paz', RTN: '0801',
})

const payInvoice = async (finalCai: unknown, deliveryRepo = new MemoryDeliveryRepository()) => {
  let row = invoiceFixture(null)
  const invoiceRepo: any = {
    findByInvoiceNumberForUpdate: async () => ({ ...row }),
    updateByInvoiceNumber: async (_id: string, update: Record<string, unknown>) => { row = { ...row, ...update } },
    findByInvoiceNumber: async () => ({ ...row }),
  }
  const billing: any = {
    getInvoiceSnapshot: async () => ({ invoice: { patientName: 'Ada Paz' }, summary: {}, charges: [] }),
    updateEncounterStatusByInvoice: async () => null,
  }
  Database.transaction = async <T>(fn: () => Promise<T>) => fn()
  PoolManager.resolveEmpresa = async () => ({
    CodigoEmpresa: 'TEN', NombreEmpresa: 'Clínica Uno', NombreBaseDatos: 'tenant',
    ServidorDB: 'db', PuertoDB: 3306, Activo: 1,
  })
  const service = new InvoiceService({} as any, invoiceRepo, billing, new DocumentDeliveryService(deliveryRepo))
  await service.updateInvById('ORIGINAL-INV-9', { cai: finalCai, amount: 125 }, 'TEN')
  return { row, delivery: [...deliveryRepo.rows.values()][0] }
}

describe('paid invoice delivery', () => {
  test('CAI present produces an invoice and reuses InvoiceNumber unchanged', async () => {
    const { row, delivery } = await payInvoice(' CAI-123 ')
    assert.equal(row.Estado, 'Pagado')
    assert.equal(delivery.documentType, 'invoice')
    assert.equal(delivery.sourceId, 'ORIGINAL-INV-9')
    assert.equal(delivery.sourceVersion, '1')
    assert.equal(JSON.parse(delivery.snapshotJson).InvoiceNumber, 'ORIGINAL-INV-9')
  })

  for (const [label, cai] of [['null', null], ['empty', ''], ['whitespace', '   ']] as const) {
    test(`${label} CAI produces a receipt`, async () => {
      const { delivery } = await payInvoice(cai)
      assert.equal(delivery.documentType, 'receipt')
    })
  }

  test('payment and enqueue share one atomic callback and enqueue failure rejects payment', async () => {
    let transactionCalls = 0
    let updated = false
    Database.transaction = async <T>(fn: () => Promise<T>) => {
      transactionCalls += 1
      try {
        const result = await fn()
        return result
      } catch (error) {
        updated = false // models the rollback performed by Database.transaction
        throw error
      }
    }
    PoolManager.resolveEmpresa = async () => ({ CodigoEmpresa: 'TEN', NombreEmpresa: 'Tenant', NombreBaseDatos: 'db', ServidorDB: 'db', PuertoDB: 3306, Activo: 1 })
    const invoiceRepo: any = {
      findByInvoiceNumberForUpdate: async () => invoiceFixture('CAI'),
      updateByInvoiceNumber: async () => { updated = true },
      findByInvoiceNumber: async () => ({ ...invoiceFixture('CAI'), Estado: 'Pagado' }),
    }
    const delivery: any = { enqueue: async () => { throw new Error('outbox unavailable') } }
    const billing: any = { getInvoiceSnapshot: async () => ({}), updateEncounterStatusByInvoice: async () => null }
    const service = new InvoiceService({} as any, invoiceRepo, billing, delivery)
    const originalConsoleError = console.error
    console.error = () => {}
    try {
      await assert.rejects(service.updateInvById('ORIGINAL-INV-9', {}, 'TEN'), /outbox unavailable/)
    } finally {
      console.error = originalConsoleError
    }
    assert.equal(updated, false)
    assert.equal(transactionCalls, 1)
  })
})

describe('accepted consent delivery', () => {
  test('stores immutable signer/template snapshot and queues without rendering a PDF or sending mail', async () => {
    Database.transaction = async <T>(fn: () => Promise<T>) => fn()
    PoolManager.resolveEmpresa = async () => ({ CodigoEmpresa: 'TEN', NombreEmpresa: 'Clínica Uno', NombreBaseDatos: 'db', ServidorDB: 'db', PuertoDB: 3306, Activo: 1 })
    let created: any
    const consentRepo: any = {
      getVisitContext: async () => ({
        visitId: 8, visitDate: '2026-08-19', patientId: 4, patientName: 'Ada Paz',
        patientBirthDate: '1990-01-01', patientPhone: '9999', patientEmail: 'ada@example.com',
        patientIdentification: '0801', doctorId: 2, doctorUserId: 3, doctorName: 'Dr. Uno',
      }),
      findTemplate: async () => ({ id: 7, version_id: 12, current_version: 3, name: 'Cirugía', content: 'Contenido congelado', is_active: 1 }),
      createInstance: async (params: any) => { created = params; return 44 },
    }
    const attachments: any = {
      hasPrescriptionAssets: async () => ({ signature: true, stamp: true }),
      preserveConsentAssets: async () => ({
        signerObject: 'TEN/consents/accepted/x/signer.json',
        doctorSignatureObject: 'TEN/consents/accepted/x/doctor-signature.png',
        doctorStampObject: 'TEN/consents/accepted/x/doctor-stamp.png',
      }),
    }
    const deliveries = new MemoryDeliveryRepository()
    const service = new ConsentsService(consentRepo, attachments, new DocumentDeliveryService(deliveries))
    const result = await service.acceptElectronic(8, 7, 'TEN', 6, { mode: 'checkbox', signerType: 'patient' })
    const snapshot = JSON.parse(created.snapshotJson)
    const delivery = [...deliveries.rows.values()][0]
    assert.equal(result.id, 44)
    assert.equal(snapshot.templateContent, 'Contenido congelado')
    assert.equal(snapshot.templateVersion, 3)
    assert.equal(snapshot.signer.signatureObject, 'TEN/consents/accepted/x/signer.json')
    assert.ok(snapshot.acceptedAt)
    assert.equal(delivery.documentType, 'consent')
    assert.equal(delivery.sourceId, '44')
    assert.equal(delivery.sourceVersion, '3')
    assert.equal(delivery.status, 'pending')
  })

  test('keeps an approved physical image unchanged and queues its source object', async () => {
    Database.transaction = async <T>(fn: () => Promise<T>) => fn()
    const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'white' } }).png().toBuffer()
    let uploaded: any
    let accepted: any
    const consentRepo: any = {
      findInstance: async () => ({
        id: 55, status: 'printed', patient_id: 4, record_id: 8,
        template_name: 'Consentimiento', template_version: 2,
        snapshot_json: JSON.stringify({ patientEmail: 'physical@example.com', templateContent: 'Frozen' }),
      }),
      acceptPhysicalInstance: async (params: any) => { accepted = params },
    }
    const attachments: any = {
      upload: async (params: any) => {
        uploaded = params
        return { id: 91, gcs_object_path: 'TEN/patients/4/approved-original.png' }
      },
    }
    const deliveries = new MemoryDeliveryRepository()
    const service = new ConsentsService(consentRepo, attachments, new DocumentDeliveryService(deliveries))
    await service.acceptPhysical(55, 'TEN', 6, {
      buffer: image, originalname: 'signed.png', mimetype: 'image/png',
    } as Express.Multer.File)
    const delivery = [...deliveries.rows.values()][0]
    assert.deepEqual(uploaded.buffer, image)
    assert.equal(uploaded.immutable, true)
    assert.equal(uploaded.declaredMime, 'image/png')
    assert.equal(delivery.sourceObject, 'TEN/patients/4/approved-original.png')
    assert.equal(delivery.sourceVersion, '2')
    assert.match(accepted.snapshotJson, /approved-original\.png/)
  })
})
