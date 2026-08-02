import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { ClinicalAttachmentsService, UploadAttachmentParams } from '../application/services/clinical-attachments.service'
import { ClinicalAttachmentsRepository, CreateAttachmentParams } from '../application/ports/clinical-attachments.repository'
import { FileStorage, SaveFileOptions } from '../application/ports/file-storage'
import { ClinicalAttachment } from '../domain/entities/ClinicalAttachment'
import { parseRangeHeader } from '../utils/httpRange'

class FakeStorage implements FileStorage {
  public saved: Array<{ path: string; data: Buffer; options: SaveFileOptions }> = []

  async save(objectPath: string, data: Buffer, options: SaveFileOptions): Promise<void> {
    this.saved.push({ path: objectPath, data, options })
  }

  createReadStream(): NodeJS.ReadableStream {
    return Readable.from(this.saved[this.saved.length - 1]?.data ?? Buffer.alloc(0))
  }
}

class FakeRepo implements ClinicalAttachmentsRepository {
  public rows = new Map<string, ClinicalAttachment>()
  public accessLog: Array<{ attachmentId: string; accessedBy: string; ip: string | null }> = []

  async create(p: CreateAttachmentParams): Promise<string> {
    const id = randomUUID()
    this.rows.set(id, {
      id,
      patient_id: p.patientId,
      record_id: p.recordId,
      label: p.label,
      source: p.source,
      gcs_object_path: p.gcsObjectPath,
      mime_type: p.mimeType,
      size_bytes: p.sizeBytes,
      uploaded_by: p.uploadedBy,
      created_at: new Date().toISOString(),
      deleted_at: null,
    })
    return id
  }

  async findById(id: string): Promise<ClinicalAttachment | null> {
    const row = this.rows.get(id)
    return row && !row.deleted_at ? row : null
  }

  async listByPatient(patientId: string): Promise<ClinicalAttachment[]> {
    return [...this.rows.values()].filter((r) => r.patient_id === patientId && !r.deleted_at)
  }

  async softDelete(id: string): Promise<void> {
    const row = this.rows.get(id)
    if (row) row.deleted_at = new Date().toISOString()
  }

  async logAccess(attachmentId: string, accessedBy: string, ip: string | null): Promise<void> {
    this.accessLog.push({ attachmentId, accessedBy, ip })
  }
}

const buildService = () => {
  const repo = new FakeRepo()
  const clinical = new FakeStorage()
  const pub = new FakeStorage()
  const service = new ClinicalAttachmentsService(repo, clinical, pub)
  return { service, repo, clinical, pub }
}

const baseParams = (overrides: Partial<UploadAttachmentParams>): UploadAttachmentParams => ({
  tenantCode: 'HNCAMI',
  patientId: '00000000-0000-4000-8000-000000000042',
  recordId: null,
  label: 'Radiografía de tórax',
  source: 'file_upload',
  buffer: Buffer.from('%PDF-1.4\n%âãÏÓ\ntest'),
  originalName: 'scan.pdf',
  declaredMime: 'application/pdf',
  uploadedBy: '00000000-0000-4000-8000-000000000007',
  ...overrides,
})

const expectValidationError = async (promise: Promise<unknown>, msgPart: string) => {
  await assert.rejects(promise, (err: any) => {
    assert.equal(err.name, 'validation_errors')
    assert.ok(
      err.errors.some((e: any) => e.msg.includes(msgPart)),
      `expected an error containing "${msgPart}", got: ${JSON.stringify(err.errors)}`
    )
    return true
  })
}

describe('MIME whitelist (magic-byte sniffing)', () => {
  test('rejects an executable disguised with an image MIME type and .png name', async () => {
    const { service, clinical } = buildService()
    // MZ header — a Windows PE executable, declared as image/png
    const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200)])
    await expectValidationError(
      service.upload(baseParams({ buffer: exe, originalName: 'innocent.png', declaredMime: 'image/png' })),
      'no permitido'
    )
    assert.equal(clinical.saved.length, 0, 'nothing must reach storage')
  })

  test('rejects a GIF even though it is a real image (not on the whitelist)', async () => {
    const { service } = buildService()
    const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(64)])
    await expectValidationError(
      service.upload(baseParams({ buffer: gif, originalName: 'anim.gif', declaredMime: 'image/gif' })),
      'no permitido'
    )
  })

  test('rejects content whose type cannot be determined', async () => {
    const { service } = buildService()
    const noise = Buffer.from('just some plain text, no magic bytes here at all')
    await expectValidationError(
      service.upload(baseParams({ buffer: noise, originalName: 'notes.txt', declaredMime: 'application/pdf' })),
      'No se pudo determinar'
    )
  })

  test('accepts a real PDF regardless of the declared MIME type', async () => {
    const { service, clinical } = buildService()
    const created = await service.upload(baseParams({ declaredMime: 'application/octet-stream' }))
    assert.equal(created.mime_type, 'application/pdf')
    assert.equal(clinical.saved.length, 1)
    assert.ok(created.gcs_object_path.startsWith(`HNCAMI/patients/${baseParams({}).patientId}/`))
  })

  test('file_upload stores the original bytes untouched (no recompression)', async () => {
    const { service, clinical } = buildService()
    const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#336699' } })
      .png().toBuffer()
    await service.upload(baseParams({ buffer: png, originalName: 'foto.png', declaredMime: 'image/png' }))
    assert.ok(clinical.saved[0].data.equals(png), 'stored buffer must be byte-identical')
  })
})

describe('in_app_camera pipeline (sharp)', () => {
  test('resizes to ≤2048px, converts to JPEG and strips metadata', async () => {
    const { service, clinical } = buildService()
    const bigPhoto = await sharp({ create: { width: 3200, height: 2400, channels: 3, background: '#884422' } })
      .jpeg({ quality: 95 }).withMetadata().toBuffer()

    const created = await service.upload(baseParams({
      buffer: bigPhoto, source: 'in_app_camera', originalName: 'herida.jpeg', declaredMime: 'image/jpeg',
    }))

    assert.equal(created.mime_type, 'image/jpeg')
    const meta = await sharp(clinical.saved[0].data).metadata()
    assert.equal(meta.width, 2048)
    assert.equal(meta.exif, undefined, 'EXIF must be stripped')
    assert.ok(clinical.saved[0].data.length < 3 * 1024 * 1024, 'processed image must be < 3MB')
    assert.ok(created.gcs_object_path.endsWith('.jpg'))
  })

  test('rejects non-image content from the in-app camera', async () => {
    const { service } = buildService()
    await expectValidationError(
      service.upload(baseParams({ source: 'in_app_camera' })), // baseParams buffer is a PDF
      'deben ser imágenes'
    )
  })

  test('enforces the 10MB camera limit (vs 25MB for file uploads)', async () => {
    const { service } = buildService()
    const oversized = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(11 * 1024 * 1024)])
    await expectValidationError(
      service.upload(baseParams({ buffer: oversized, source: 'in_app_camera', declaredMime: 'image/jpeg' })),
      '10MB'
    )
  })
})

describe('upload input validation', () => {
  test('rejects an unknown source value', async () => {
    const { service } = buildService()
    await expectValidationError(service.upload(baseParams({ source: 'email' })), "source")
  })

  test('rejects a missing label', async () => {
    const { service } = buildService()
    await expectValidationError(service.upload(baseParams({ label: '   ' })), 'etiqueta')
  })
})

describe('tenant path defense in depth', () => {
  test('getForAccess refuses an attachment whose GCS path belongs to another tenant', async () => {
    const { service, repo } = buildService()
    const id = await repo.create({
      patientId: '00000000-0000-4000-8000-000000000001', recordId: null, label: 'x', source: 'file_upload',
      gcsObjectPath: 'OTHERCLINIC/patients/1/123_x.pdf', mimeType: 'application/pdf',
      sizeBytes: 10, uploadedBy: '00000000-0000-4000-8000-000000000001',
    })
    await assert.rejects(service.getForAccess(id, 'HNCAMI'), (err: any) => err.name === 'not_found_error')
    await assert.doesNotReject(service.getForAccess(id, 'OTHERCLINIC'))
  })
})

describe('parseRangeHeader', () => {
  test('bytes=0-1000 → 0..1000', () => {
    assert.deepEqual(parseRangeHeader('bytes=0-1000', 5000), { kind: 'range', range: { start: 0, end: 1000 } })
  })
  test('open-ended and suffix ranges', () => {
    assert.deepEqual(parseRangeHeader('bytes=4500-', 5000), { kind: 'range', range: { start: 4500, end: 4999 } })
    assert.deepEqual(parseRangeHeader('bytes=-500', 5000), { kind: 'range', range: { start: 4500, end: 4999 } })
  })
  test('end clamped to size', () => {
    assert.deepEqual(parseRangeHeader('bytes=0-999999', 5000), { kind: 'range', range: { start: 0, end: 4999 } })
  })
  test('no header → full body', () => {
    assert.deepEqual(parseRangeHeader(undefined, 5000), { kind: 'none' })
  })
  test('out-of-bounds or malformed → unsatisfiable (416)', () => {
    assert.deepEqual(parseRangeHeader('bytes=5000-', 5000), { kind: 'unsatisfiable' })
    assert.deepEqual(parseRangeHeader('bytes=abc', 5000), { kind: 'unsatisfiable' })
    assert.deepEqual(parseRangeHeader('bytes=-', 5000), { kind: 'unsatisfiable' })
  })
})
