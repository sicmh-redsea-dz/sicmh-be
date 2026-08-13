import { fromBuffer } from 'file-type'
import { v4 as uuidv4 } from 'uuid'

export type AttachmentCaptureStatus = 'pending' | 'uploaded' | 'expired'

export interface AttachmentCaptureSession {
  token: string
  tenantCode: string
  status: AttachmentCaptureStatus
  createdAt: string
  updatedAt: string
  expiresAt: string
  image?: {
    contentType: string
    data: string
    size: number
    fileName: string
  }
}

interface ImagePayload {
  image?: string
  fileName?: string
}

// Base64 adds roughly 33%; keep the decoded image below Express' 5MB JSON limit.
const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024
const SESSION_TTL_MS = 10 * 60 * 1000
const PRUNE_AFTER_MS = 60 * 60 * 1000
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Short-lived handoff between the public phone page and an authenticated
 * workstation. The workstation remains responsible for creating the real
 * clinical attachment, so the existing validation and GCS pipeline is reused.
 */
export class AttachmentCaptureService {
  private readonly sessions = new Map<string, AttachmentCaptureSession>()

  createSession(tenantCode: string): AttachmentCaptureSession {
    this.prune()
    const now = new Date()
    const session: AttachmentCaptureSession = {
      token: uuidv4(),
      tenantCode,
      status: 'pending',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    }
    this.sessions.set(session.token, session)
    return session
  }

  getSession(token: string, tenantCode?: string): AttachmentCaptureSession | null {
    this.prune()
    const session = this.sessions.get(token)
    if (!session || (tenantCode && session.tenantCode !== tenantCode)) return null
    if (this.isExpired(session)) {
      session.status = 'expired'
      session.updatedAt = new Date().toISOString()
    }
    return session
  }

  async saveImage(token: string, payload: ImagePayload): Promise<AttachmentCaptureSession> {
    const session = this.getSession(token)
    if (!session || session.status !== 'pending') {
      throw Object.assign(new Error('La sesión de captura no existe o ya expiró.'), { name: 'not_found_error' })
    }

    const match = String(payload.image ?? '').trim().match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    if (!match) throw this.validationError('La imagen enviada no es válida.')

    const declaredType = match[1]
    const buffer = Buffer.from(match[2], 'base64')
    if (!buffer.length) throw this.validationError('La imagen es requerida.')
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) throw this.validationError('La imagen recibida excede el tamaño máximo permitido (3MB).')

    const detected = await fromBuffer(buffer)
    if (!detected || !ALLOWED_TYPES.has(detected.mime) || !ALLOWED_TYPES.has(declaredType)) {
      throw this.validationError('La captura debe ser una imagen JPEG, PNG o WebP.')
    }

    session.status = 'uploaded'
    session.updatedAt = new Date().toISOString()
    session.image = {
      contentType: detected.mime,
      data: buffer.toString('base64'),
      size: buffer.length,
      fileName: this.sanitizeFileName(payload.fileName, detected.ext),
    }
    return session
  }

  deleteSession(token: string, tenantCode?: string): boolean {
    const session = this.sessions.get(token)
    if (!session || (tenantCode && session.tenantCode !== tenantCode)) return false
    return this.sessions.delete(token)
  }

  private isExpired(session: AttachmentCaptureSession): boolean {
    return session.status !== 'uploaded' && Date.parse(session.expiresAt) <= Date.now()
  }

  private prune(): void {
    const cutoff = Date.now() - PRUNE_AFTER_MS
    this.sessions.forEach((session, token) => {
      if (Date.parse(session.updatedAt) < cutoff) this.sessions.delete(token)
    })
  }

  private sanitizeFileName(value: string | undefined, extension: string): string {
    const cleaned = String(value ?? 'foto-desde-celular')
      .split(/[\\/]/).pop()!
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 100)
    return cleaned || `foto-desde-celular.${extension}`
  }

  private validationError(message: string): Error {
    return Object.assign(new Error('Validation error'), {
      name: 'validation_errors',
      errors: [{ msg: message }],
    })
  }
}

export const attachmentCaptureService = new AttachmentCaptureService()
