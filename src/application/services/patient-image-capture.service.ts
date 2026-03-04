import { v4 as uuidv4 } from 'uuid'

import { PatientImageCaptureRepository } from '../ports/patient-image-capture.repository'
import { PatientImageCaptureRecord, PatientImageCaptureStore } from '../../domain/entities/PatientImageCapture'

interface ImagePayload {
  image: string
  fileName?: string
  contentType?: string
}

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const DEFAULT_TTL_MINUTES = 10
const PRUNE_AFTER_MS = 60 * 60 * 1000

export class PatientImageCaptureService {
  constructor(private readonly captureRepo: PatientImageCaptureRepository) {}

  createSession = async (ttlMinutes = DEFAULT_TTL_MINUTES): Promise<PatientImageCaptureRecord> => {
    const store = await this.captureRepo.load()
    this.pruneExpired(store)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000)

    const session: PatientImageCaptureRecord = {
      token: uuidv4(),
      status: 'pending',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    }

    store.sessions[session.token] = session
    store.updatedAt = session.updatedAt
    await this.captureRepo.save(store)
    return session
  }

  getSession = async (token: string): Promise<PatientImageCaptureRecord | null> => {
    const store = await this.captureRepo.load()
    const pruned = this.pruneExpired(store)
    const session = store.sessions[token]
    if (!session) {
      if (pruned) {
        await this.captureRepo.save(store)
      }
      return null
    }

    if (this.isExpired(session)) {
      session.status = 'expired'
      session.updatedAt = new Date().toISOString()
      store.updatedAt = session.updatedAt
      await this.captureRepo.save(store)
      return session
    }

    if (pruned) {
      await this.captureRepo.save(store)
    }
    return session
  }

  saveImage = async (token: string, payload: ImagePayload): Promise<PatientImageCaptureRecord> => {
    const store = await this.captureRepo.load()
    this.pruneExpired(store)
    const session = store.sessions[token]
    if (!session || this.isExpired(session)) {
      throw this.buildNotFoundError(`No active capture session for token ${token}`)
    }

    const parsed = this.parseImage(payload)
    const size = Buffer.from(parsed.data, 'base64').length

    if (size > MAX_IMAGE_SIZE_BYTES) {
      throw this.buildValidationError(['La imagen es demasiado grande.'])
    }

    const updatedAt = new Date().toISOString()
    session.status = 'uploaded'
    session.updatedAt = updatedAt
    session.image = {
      contentType: parsed.contentType,
      data: parsed.data,
      size,
      fileName: payload.fileName
    }

    store.updatedAt = updatedAt
    store.sessions[token] = session
    await this.captureRepo.save(store)
    return session
  }

  deleteSession = async (token: string): Promise<boolean> => {
    const store = await this.captureRepo.load()
    if (!store.sessions[token]) return false
    delete store.sessions[token]
    store.updatedAt = new Date().toISOString()
    await this.captureRepo.save(store)
    return true
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

  private isExpired(session: PatientImageCaptureRecord) {
    if (session.status === 'uploaded' && session.image) return false
    return new Date(session.expiresAt).getTime() <= Date.now()
  }

  private pruneExpired(store: PatientImageCaptureStore): boolean {
    const now = Date.now()
    let changed = false
    Object.entries(store.sessions).forEach(([token, session]) => {
      const lastActivity = new Date(session.updatedAt).getTime()
      if (now - lastActivity > PRUNE_AFTER_MS) {
        delete store.sessions[token]
        changed = true
      }
    })
    if (changed) {
      store.updatedAt = new Date().toISOString()
    }
    return changed
  }

  private buildValidationError(messages: string[]) {
    const err: any = new Error('Validation error')
    err.name = 'validation_errors'
    err.errors = messages.map((msg) => ({ msg }))
    return err
  }

  private buildNotFoundError(message: string) {
    const err: any = new Error(message)
    err.name = 'not_found_error'
    return err
  }
}
