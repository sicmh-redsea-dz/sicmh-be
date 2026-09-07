import { Request } from 'express'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { asyncHandler, htmlResponse } from '../decorators/asyncHandler'

export class AttachmentCaptureController {
  private get service() {
    return ServiceContainer.getAttachmentCaptureService()
  }

  @asyncHandler()
  async create(req: Request): Promise<any> {
    const baseUrl = `${req.protocol}://${req.get('host')}`
    return this.service.createSession(baseUrl)
  }

  @asyncHandler()
  async status(req: Request): Promise<any> {
    return this.service.getStatus(String(req.params['token']))
  }

  @asyncHandler()
  async remove(req: Request): Promise<any> {
    this.service.deleteSession(String(req.params['token']))
    return { deleted: true }
  }

  @htmlResponse()
  page(req: Request): any {
    return this.service.renderPage(String(req.params['token']))
  }

  @htmlResponse()
  async upload(req: Request): Promise<any> {
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) {
      throw Object.assign(new Error('Validation error'), {
        name: 'validation_errors',
        errors: [{ msg: "La imagen es requerida (campo 'file')." }],
      })
    }
    await this.service.storeUpload(String(req.params['token']), file.buffer, file.originalname, file.mimetype)
    return `
      <!doctype html>
      <html lang="es">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Foto enviada</title></head>
        <body style="font-family:Arial,sans-serif;background:#ecfdf3;color:#067647;padding:24px">
          <h1>Foto enviada</h1>
          <p>La imagen ya quedó disponible en la computadora. Puedes cerrar esta ventana.</p>
        </body>
      </html>
    `
  }
}
