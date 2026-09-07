import { randomUUID } from 'crypto'
import { fromBuffer } from 'file-type'
import sharp from 'sharp'

type AttachmentCaptureSession = {
  token: string
  captureUrl: string
  qrDataUrl: string
  expiresAt: string
}

type AttachmentCaptureStatus = {
  status: 'pending' | 'uploaded' | 'expired'
  image?: { dataUrl: string; fileName: string }
}

type StoredSession = {
  captureUrl: string
  expiresAt: number
  image?: { dataUrl: string; fileName: string }
}

const EXPIRATION_MS = 10 * 60 * 1000
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export class AttachmentCaptureService {
  private readonly sessions = new Map<string, StoredSession>()

  createSession(baseUrl: string): AttachmentCaptureSession {
    this.pruneExpired()
    const token = randomUUID()
    const captureUrl = `${baseUrl.replace(/\/+$/, '')}/public/attachment-capture/${token}`
    const expiresAt = Date.now() + EXPIRATION_MS
    this.sessions.set(token, {
      captureUrl,
      expiresAt,
    })
    return {
      token,
      captureUrl,
      qrDataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(captureUrl)}`,
      expiresAt: new Date(expiresAt).toISOString(),
    }
  }

  getStatus(token: string): AttachmentCaptureStatus {
    this.pruneExpired()
    const session = this.sessions.get(token)
    if (!session) return { status: 'expired' }
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(token)
      return { status: 'expired' }
    }
    if (session.image) return { status: 'uploaded', image: session.image }
    return { status: 'pending' }
  }

  deleteSession(token: string): void {
    this.sessions.delete(token)
  }

  async storeUpload(token: string, buffer: Buffer, originalName: string, mimeType: string): Promise<void> {
    this.pruneExpired()
    const session = this.sessions.get(token)
    if (!session || session.expiresAt <= Date.now()) {
      throw this.validationError('La sesión de captura expiró. Genera un código nuevo.')
    }
    if (!buffer?.length) throw this.validationError('La imagen es requerida.')
    if (buffer.length > MAX_UPLOAD_BYTES) throw this.validationError('La imagen excede el tamaño máximo permitido (10MB).')

    const sniffed = await fromBuffer(buffer)
    const detectedMime = sniffed?.mime ?? mimeType
    if (!ALLOWED_IMAGE_TYPES.has(detectedMime)) {
      throw this.validationError('Solo se permiten imágenes JPEG, PNG o WebP.')
    }

    const normalized = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()

    session.image = {
      dataUrl: `data:image/jpeg;base64,${normalized.toString('base64')}`,
      fileName: this.safeFileName(originalName),
    }
  }

  renderPage(token: string): string {
    const status = this.getStatus(token)
    const expired = status.status === 'expired'
    return `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Capturar foto</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f7fb; color: #101828; margin: 0; padding: 24px; }
            .card { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 18px 42px rgba(16,24,40,.12); }
            h1 { margin-top: 0; font-size: 24px; }
            p { line-height: 1.55; }
            input, button { width: 100%; font-size: 16px; }
            input { margin: 16px 0; }
            button { border: 0; border-radius: 12px; padding: 14px 16px; font-weight: 700; background: #0f766e; color: #fff; }
            .state { margin-top: 16px; padding: 12px; border-radius: 10px; background: ${expired ? '#fef3f2' : '#ecfdf3'}; color: ${expired ? '#b42318' : '#067647'}; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Enviar foto al expediente</h1>
            <p>Toma la foto o selecciona una imagen y presiona <strong>Enviar foto</strong>. Cuando termine, vuelve a la computadora.</p>
            ${expired ? '<div class="state">Este código ya expiró. Solicita uno nuevo desde la computadora.</div>' : `
              <form method="post" enctype="multipart/form-data">
                <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/*" capture="environment" required>
                <button type="submit">Enviar foto</button>
              </form>
              ${status.status === 'uploaded' ? '<div class="state">La foto ya fue recibida. Puedes cerrar esta ventana.</div>' : ''}
            `}
          </div>
        </body>
      </html>
    `
  }

  private pruneExpired() {
    const now = Date.now()
    for (const [token, session] of this.sessions) {
      if (session.expiresAt <= now) this.sessions.delete(token)
    }
  }

  private safeFileName(originalName: string) {
    const base = (originalName || 'captura.jpg').split(/[\\/]/).pop() || 'captura.jpg'
    const clean = base.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '')
    return clean || 'captura.jpg'
  }

  private validationError(message: string) {
    const err: any = new Error(message)
    err.name = 'validation_errors'
    err.errors = [{ msg: message }]
    return err
  }
}
