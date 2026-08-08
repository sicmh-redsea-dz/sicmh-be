import { fromBuffer } from 'file-type'
import sharp from 'sharp'
import { ClinicalAttachmentsRepository } from '../ports/clinical-attachments.repository'
import { FileStorage } from '../ports/file-storage'
import { AttachmentSource, ClinicalAttachment } from '../../domain/entities/ClinicalAttachment'

const MAX_CAMERA_UPLOAD_BYTES = 10 * 1024 * 1024
const MAX_FILE_UPLOAD_BYTES = 25 * 1024 * 1024
const MAX_PROCESSED_IMAGE_BYTES = 3 * 1024 * 1024
const CAMERA_TARGET_WIDTH = 2048
const MAX_LOGO_BYTES = 5 * 1024 * 1024
export type PrescriptionAssetType = 'signature' | 'stamp'

// Whitelist enforced by content sniffing (magic bytes), never by filename extension.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface UploadAttachmentParams {
  tenantCode: string
  patientId: number
  recordId: number | null
  label: string
  source: string
  buffer: Buffer
  originalName: string
  declaredMime: string
  uploadedBy: number
}

export class ClinicalAttachmentsService {
  constructor(
    private readonly attachmentsRepo: ClinicalAttachmentsRepository,
    private readonly clinicalStorage: FileStorage,
    private readonly publicStorage: FileStorage
  ) {}

  upload = async (params: UploadAttachmentParams): Promise<ClinicalAttachment> => {
    const source = this.parseSource(params.source)
    const label = (params.label ?? '').trim()
    if (!label) throw this.buildValidationError(['La etiqueta del archivo es requerida.'])
    if (label.length > 255) throw this.buildValidationError(['La etiqueta no puede exceder 255 caracteres.'])
    if (!params.buffer?.length) throw this.buildValidationError(['El archivo es requerido.'])

    const maxBytes = source === 'in_app_camera' ? MAX_CAMERA_UPLOAD_BYTES : MAX_FILE_UPLOAD_BYTES
    if (params.buffer.length > maxBytes) {
      throw this.buildValidationError([
        `El archivo excede el tamaño máximo permitido (${Math.floor(maxBytes / (1024 * 1024))}MB).`,
      ])
    }

    const sniffedMime = await this.sniffMime(params.buffer, params.declaredMime)
    if (!ALLOWED_MIME_TYPES.has(sniffedMime)) {
      throw this.buildValidationError(['Tipo de archivo no permitido.'])
    }

    let finalBuffer = params.buffer
    let finalMime = sniffedMime
    let fileName = this.sanitizeFileName(params.originalName)

    if (source === 'in_app_camera') {
      if (!IMAGE_MIME_TYPES.has(sniffedMime)) {
        throw this.buildValidationError(['Las capturas de cámara deben ser imágenes (JPEG, PNG o WebP).'])
      }
      // sharp strips all metadata (EXIF/GPS) by default — .withMetadata() is intentionally NOT called.
      finalBuffer = await sharp(params.buffer)
        .rotate() // apply EXIF orientation before it is stripped
        .resize({ width: CAMERA_TARGET_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()

      if (finalBuffer.length > MAX_PROCESSED_IMAGE_BYTES) {
        throw this.buildValidationError(['La imagen procesada excede el tamaño máximo de 3MB.'])
      }
      finalMime = 'image/jpeg'
      fileName = `${fileName.replace(/\.[^.]*$/, '') || 'captura'}.jpg`
    }

    const gcsObjectPath = `${params.tenantCode}/patients/${params.patientId}/${Date.now()}_${fileName}`
    await this.clinicalStorage.save(gcsObjectPath, finalBuffer, {
      contentType: finalMime,
      cacheControl: 'private, no-store',
    })

    const id = await this.attachmentsRepo.create({
      patientId: params.patientId,
      recordId: params.recordId,
      label,
      source,
      gcsObjectPath,
      mimeType: finalMime,
      sizeBytes: finalBuffer.length,
      uploadedBy: params.uploadedBy,
    })

    const created = await this.attachmentsRepo.findById(id)
    if (!created) throw new Error('No se pudo registrar el archivo adjunto.')
    return created
  }

  listByPatient = async (patientId: number, recordId?: number | null): Promise<ClinicalAttachment[]> => {
    return this.attachmentsRepo.listByPatient(patientId, recordId)
  }

  /**
   * Resolves an attachment for streaming. Verifies the GCS path is prefixed
   * with the caller's tenant code as defense in depth — the tenant DB
   * connection should already scope the lookup.
   */
  getForAccess = async (id: number, tenantCode: string): Promise<ClinicalAttachment> => {
    const attachment = await this.attachmentsRepo.findById(id)
    if (!attachment || !attachment.gcs_object_path.startsWith(`${tenantCode}/`)) {
      throw Object.assign(new Error('Archivo adjunto no encontrado.'), { name: 'not_found_error' })
    }
    return attachment
  }

  logAccess = async (attachmentId: number, accessedBy: number, ipAddress: string | null): Promise<void> => {
    await this.attachmentsRepo.logAccess(attachmentId, accessedBy, ipAddress)
  }

  createReadStream = (attachment: ClinicalAttachment, range?: { start: number; end: number }) => {
    return this.clinicalStorage.createReadStream(attachment.gcs_object_path, range)
  }

  softDelete = async (id: number, tenantCode: string): Promise<void> => {
    await this.getForAccess(id, tenantCode)
    await this.attachmentsRepo.softDelete(id)
  }

  /**
   * Tenant logo: converted to PNG and stored at a fixed, publicly readable
   * path — no metadata row, the frontend builds the URL directly.
   */
  uploadLogo = async (tenantCode: string, buffer: Buffer): Promise<{ objectPath: string }> => {
    if (!buffer?.length) throw this.buildValidationError(['La imagen del logo es requerida.'])
    if (buffer.length > MAX_LOGO_BYTES) {
      throw this.buildValidationError(['El logo excede el tamaño máximo permitido (5MB).'])
    }

    const sniffed = await fromBuffer(buffer)
    if (!sniffed || !IMAGE_MIME_TYPES.has(sniffed.mime)) {
      throw this.buildValidationError(['El logo debe ser una imagen (JPEG, PNG o WebP).'])
    }

    const png = await sharp(buffer)
      .rotate()
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()

    const objectPath = `${tenantCode}/logo.png`
    await this.publicStorage.save(objectPath, png, {
      contentType: 'image/png',
      cacheControl: 'public, max-age=300',
    })
    return { objectPath }
  }

  uploadPrescriptionAsset = async (tenantCode: string, userId: number, type: PrescriptionAssetType, buffer: Buffer): Promise<{ objectPath: string }> => {
    if (!buffer?.length) throw this.buildValidationError(['La imagen es requerida.'])
    if (buffer.length > MAX_LOGO_BYTES) {
      throw this.buildValidationError(['La imagen excede el tamaño máximo permitido (5MB).'])
    }
    const sniffed = await fromBuffer(buffer)
    if (!sniffed || !IMAGE_MIME_TYPES.has(sniffed.mime)) {
      throw this.buildValidationError(['La firma o sello debe ser una imagen (JPEG, PNG o WebP).'])
    }

    const png = await sharp(buffer)
      .rotate()
      .resize({ width: 1400, height: 700, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()
    const objectPath = `${tenantCode}/users/${userId}/${type}.png`
    await this.publicStorage.save(objectPath, png, {
      contentType: 'image/png',
      cacheControl: 'public, max-age=300',
    })
    return { objectPath }
  }

  private parseSource(source: string): AttachmentSource {
    if (source === 'in_app_camera' || source === 'file_upload') return source
    throw this.buildValidationError(["El campo 'source' debe ser 'in_app_camera' o 'file_upload'."])
  }

  private async sniffMime(buffer: Buffer, declaredMime: string): Promise<string> {
    const sniffed = await fromBuffer(buffer)
    if (!sniffed) {
      throw this.buildValidationError(['No se pudo determinar el tipo de archivo.'])
    }
    // Legacy .doc files are OLE2/CFB containers; file-type reports the container
    // format, so accept it as msword only when the client also declared msword.
    if (sniffed.mime === 'application/x-cfb' && declaredMime === 'application/msword') {
      return 'application/msword'
    }
    return sniffed.mime
  }

  private sanitizeFileName(name: string): string {
    const base = (name ?? '').split(/[\\/]/).pop() ?? ''
    const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 120)
    return cleaned || 'archivo'
  }

  private buildValidationError(messages: string[]) {
    const err: any = new Error('Validation error')
    err.name = 'validation_errors'
    err.errors = messages.map((msg) => ({ msg }))
    return err
  }
}
