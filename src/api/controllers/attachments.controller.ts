import { Request, Response, NextFunction } from 'express'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { TokenPayload } from '../../utils/jwtUtils'
import { parseRangeHeader } from '../../utils/httpRange'
import { config } from '../../config/env'

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

  upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
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
        patientId: Number(req.params['id']),
        recordId: recordId ? Number(recordId) : null,
        label: String(label ?? ''),
        source: String(source ?? ''),
        buffer: file.buffer,
        originalName: file.originalname,
        declaredMime: file.mimetype,
        uploadedBy: Number(user.uid),
      })
      res.status(201).json({ data })
    } catch (err) { next(err) }
  }

  listByPatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recordId = req.query['recordId'] ? Number(req.query['recordId']) : null
      const data = await this.service.listByPatient(Number(req.params['id']), recordId)
      res.json({ data })
    } catch (err) { next(err) }
  }

  view = async (req: Request, res: Response, next: NextFunction) => {
    await this.stream(req, res, next, 'inline')
  }

  download = async (req: Request, res: Response, next: NextFunction) => {
    await this.stream(req, res, next, 'attachment')
  }

  softDelete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      await this.service.softDelete(Number(req.params['id']), user.codigoEmpresa)
      res.json({ data: { deleted: true } })
    } catch (err) { next(err) }
  }

  uploadLogo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      const file = (req as any).file as Express.Multer.File | undefined
      if (!file) {
        throw Object.assign(new Error('Validation error'), {
          name: 'validation_errors',
          errors: [{ msg: "La imagen del logo es requerida (campo 'file')." }],
        })
      }
      const { objectPath } = await this.service.uploadLogo(user.codigoEmpresa, file.buffer)
      res.status(201).json({
        data: { url: `https://storage.googleapis.com/${config.GCS_PUBLIC_BUCKET}/${objectPath}` },
      })
    } catch (err) { next(err) }
  }

  private stream = async (req: Request, res: Response, next: NextFunction, disposition: 'inline' | 'attachment') => {
    try {
      const user = (req as any).user as TokenPayload
      const attachment = await this.service.getForAccess(Number(req.params['id']), user.codigoEmpresa)

      // Audit before serving any bytes — every /view and /download hit is logged.
      await this.service.logAccess(attachment.id, Number(user.uid), req.ip ?? null)

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
    } catch (err) { next(err) }
  }

  private buildDisposition(type: 'inline' | 'attachment', label: string, mime: string): string {
    if (type === 'inline') return 'inline'

    const ext = EXTENSION_BY_MIME[mime] ?? ''
    const withExt = label.toLowerCase().endsWith(ext) || !ext ? label : `${label}${ext}`
    const asciiFallback = withExt.replace(/[^\x20-\x7E]+/g, '_').replace(/["\\]/g, '_')
    return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(withExt)}`
  }
}
