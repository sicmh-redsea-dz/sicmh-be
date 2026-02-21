import { PatientImagesRepository } from '../ports/patient-images.repository'
import { PatientImageRecord } from '../../domain/entities/PatientImage'

interface ImagePayload {
  image: string
  contentType?: string
}

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export class PatientImagesService {
  constructor(private readonly imagesRepo: PatientImagesRepository) {}

  getImage = async (patientId: number): Promise<PatientImageRecord | null> => {
    const store = await this.imagesRepo.load()
    return store.images[String(patientId)] ?? null
  }

  saveImage = async (patientId: number, payload: ImagePayload): Promise<PatientImageRecord> => {
    const parsed = this.parseImage(payload)
    const size = Buffer.from(parsed.data, 'base64').length

    if (size > MAX_IMAGE_SIZE_BYTES) {
      throw this.buildValidationError(['La imagen es demasiado grande.'])
    }

    const store = await this.imagesRepo.load()
    const record: PatientImageRecord = {
      patientId,
      contentType: parsed.contentType,
      data: parsed.data,
      size,
      updatedAt: new Date().toISOString()
    }

    store.images[String(patientId)] = record
    store.updatedAt = record.updatedAt
    await this.imagesRepo.save(store)
    return record
  }

  private parseImage(payload: ImagePayload) {
    if (!payload.image) {
      throw this.buildValidationError(['La imagen es requerida.'])
    }

    const trimmed = payload.image.trim()
    const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    if (match) {
      const contentType = match[1]
      if (!ALLOWED_TYPES.includes(contentType)) {
        throw this.buildValidationError(['Tipo de imagen no permitido.'])
      }
      return { contentType, data: match[2] }
    }

    if (!payload.contentType) {
      throw this.buildValidationError(['El tipo de imagen es requerido.'])
    }
    if (!ALLOWED_TYPES.includes(payload.contentType)) {
      throw this.buildValidationError(['Tipo de imagen no permitido.'])
    }
    return { contentType: payload.contentType, data: trimmed }
  }

  private buildValidationError(messages: string[]) {
    const err: any = new Error('Validation error')
    err.name = 'validation_errors'
    err.errors = messages.map((msg) => ({ msg }))
    return err
  }
}
