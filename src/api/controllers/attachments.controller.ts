import { NextFunction, Request, Response } from 'express'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { TokenPayload } from '../../utils/jwtUtils'
import { parseRangeHeader } from '../../utils/httpRange'
import { config } from '../../config/env'
import { asyncHandler } from '../decorators/asyncHandler'

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
}

export class AttachmentsController {
  private get service() {
    return ServiceContainer.getClinicalAttachmentsService()
  }

  @asyncHandler({ mode: 'payload', statusCode: 201 })
  async upload(req: Request): Promise<any> {
    const user = (req as any).user as TokenPayload
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) {
      throw Object.assign(new Error('Validation error'), {
        name: 'validation_errors',
        errors: [{ msg: "El archivo es requerido (campo 'file')." }],
      })
    }

    const { label, source, recordId } = req.body ?? {}
    const data = await this.service.upload({
      tenantCode: user.codigoEmpresa,
      patientId: String(req.params['id']),
      recordId: recordId ? String(recordId) : null,
      label: String(label ?? ''),
      source: String(source ?? ''),
      buffer: file.buffer,
      originalName: file.originalname,
      declaredMime: file.mimetype,
      uploadedBy: user.uid,
    })

    return { data }
  }

  @asyncHandler({ mode: 'payload' })
  async listByPatient(req: Request): Promise<any> {
    const recordId = req.query['recordId'] ? String(req.query['recordId']) : null
    const data = await this.service.listByPatient(String(req.params['id']), recordId)
    return { data }
  }

  @asyncHandler({ mode: 'manual' })
  async view(req: Request, res: Response, next: NextFunction): Promise<void> {
    await this.stream(req, res, next, 'inline')
  }

  @asyncHandler({ mode: 'manual' })
  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    await this.stream(req, res, next, 'attachment')
  }

  @asyncHandler({ mode: 'payload' })
  async softDelete(req: Request): Promise<any> {
    const user = (req as any).user as TokenPayload
    await this.service.softDelete(String(req.params['id']), user.codigoEmpresa)
    return { data: { deleted: true } }
  }

  @asyncHandler({ mode: 'payload', statusCode: 201 })
  async uploadLogo(req: Request): Promise<any> {
    const user = (req as any).user as TokenPayload
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) {
      throw Object.assign(new Error('Validation error'), {
        name: 'validation_errors',
        errors: [{ msg: "La imagen del logo es requerida (campo 'file')." }],
      })
    }

    const { objectPath } = await this.service.uploadLogo(user.codigoEmpresa, file.buffer)
    return {
      data: { url: `https://storage.googleapis.com/${config.GCS_PUBLIC_BUCKET}/${objectPath}` },
    }
  }

  @asyncHandler({ mode: 'payload', statusCode: 201 })
  async uploadPrescriptionAsset(req: Request): Promise<any> {
    const user = (req as any).user as TokenPayload
    const file = (req as any).file as Express.Multer.File | undefined
    const type = String(req.params['type'] ?? '')
    if (type !== 'signature' && type !== 'stamp') {
      throw Object.assign(new Error('Validation error'), {
        name: 'validation_errors',
        errors: [{ msg: "El tipo de asset debe ser 'signature' o 'stamp'." }],
      })
    }
    if (!file) {
      throw Object.assign(new Error('Validation error'), {
        name: 'validation_errors',
        errors: [{ msg: "La imagen es requerida (campo 'file')." }],
      })
    }
    const { objectPath } = await this.service.uploadPrescriptionAsset(user.codigoEmpresa, user.uid, type, file.buffer)
    return {
      data: { url: `https://storage.googleapis.com/${config.GCS_PUBLIC_BUCKET}/${objectPath}` },
    }
  }

  private async stream(req: Request, res: Response, next: NextFunction, disposition: 'inline' | 'attachment') {
    const user = (req as any).user as TokenPayload
    const attachment = await this.service.getForAccess(String(req.params['id']), user.codigoEmpresa)

    // Audit before serving any bytes — every /view and /download hit is logged.
    await this.service.logAccess(attachment.id, user.uid, req.ip ?? null)

    const size = Number(attachment.size_bytes)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Content-Type', attachment.mime_type)
    res.setHeader('Content-Disposition', this.buildDisposition(disposition, attachment.label, attachment.mime_type))

    const parsed = parseRangeHeader(req.headers.range, size)
    if (parsed.kind === 'unsatisfiable') {
      res.status(416).setHeader('Content-Range', `bytes */${size}`)
      res.end()
      return
    }

    let range: { start: number; end: number } | undefined
    if (parsed.kind === 'range') {
      range = parsed.range
      res.status(206)
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
      res.setHeader('Content-Length', String(range.end - range.start + 1))
    } else {
      res.setHeader('Content-Length', String(size))
    }

    const stream = this.service.createReadStream(attachment, range)
    stream.on('error', (err: Error) => {
      if (res.headersSent) {
        res.destroy(err)
      } else {
        next(err)
      }
    })
    stream.pipe(res)
  }

  private buildDisposition(type: 'inline' | 'attachment', label: string, mime: string): string {
    if (type === 'inline') return 'inline'

    const ext = EXTENSION_BY_MIME[mime] ?? ''
    const withExt = label.toLowerCase().endsWith(ext) || !ext ? label : `${label}${ext}`
    const asciiFallback = withExt.replace(/[^\x20-\x7E]+/g, '_').replace(/["\\]/g, '_')
    return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(withExt)}`
  }
}
