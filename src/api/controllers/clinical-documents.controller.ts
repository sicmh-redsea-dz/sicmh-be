import { Request } from 'express'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { asyncHandler, pdfResponse } from '../decorators/asyncHandler'
import { TokenPayload } from '../../utils/jwtUtils'

export class ClinicalDocumentsController {
  private get service() {
    return ServiceContainer.getClinicalDocumentsService()
  }

  @asyncHandler()
  async getPrescription(req: Request): Promise<any> {
    const user = (req as any).user as TokenPayload
    return this.service.getPrescription(String(req.params['id']), user.codigoEmpresa)
  }

  @asyncHandler()
  async listTemplates(req: Request): Promise<any> {
    const includeInactive = String(req.query['includeInactive'] ?? '').toLowerCase() === 'true'
    return this.service.listTemplates(includeInactive)
  }

  @asyncHandler()
  async createTemplate(req: Request): Promise<any> {
    const { name, content } = req.body ?? {}
    return this.service.createTemplate(String(name ?? ''), String(content ?? ''))
  }

  @asyncHandler()
  async updateTemplate(req: Request): Promise<any> {
    const { name, content } = req.body ?? {}
    return this.service.updateTemplate(String(req.params['id']), String(name ?? ''), String(content ?? ''))
  }

  @asyncHandler()
  async setTemplateStatus(req: Request): Promise<any> {
    return this.service.setTemplateActive(String(req.params['id']), Boolean(req.body?.active))
  }

  @asyncHandler()
  async listAvailableTemplates(): Promise<any> {
    return this.service.listTemplates(false)
  }

  @asyncHandler()
  async listVisitConsents(req: Request): Promise<any> {
    return this.service.listVisitConsents(String(req.params['id']))
  }

  @asyncHandler()
  async getVisitContext(req: Request): Promise<any> {
    const user = (req as any).user as TokenPayload
    return this.service.getVisitContext(String(req.params['id']), String(req.params['templateId']), user.codigoEmpresa)
  }

  @asyncHandler()
  async getDraftContext(req: Request): Promise<any> {
    const user = (req as any).user as TokenPayload
    return this.service.getDraftContext(
      String(req.query['patientId'] ?? ''),
      String(req.query['doctorId'] ?? ''),
      req.query['date'] ? String(req.query['date']) : null,
      String(req.params['templateId']),
      user.codigoEmpresa,
    )
  }

  @asyncHandler()
  async acceptVisit(req: Request): Promise<any> {
    const user = (req as any).user as TokenPayload
    return this.service.acceptVisit(
      String(req.params['id']),
      String(req.params['templateId']),
      req.body ?? {},
      user.codigoEmpresa,
      user.uid,
    )
  }

  @pdfResponse({
    filename: (req) => `consentimiento-${String(req.params['templateId'])}.pdf`,
  })
  async printVisit(req: Request): Promise<any> {
    const user = (req as any).user as TokenPayload
    return this.service.printVisit(
      String(req.params['id']),
      String(req.params['templateId']),
      req.body?.expectedTemplateVersion !== undefined ? Number(req.body.expectedTemplateVersion) : undefined,
      user.codigoEmpresa,
    )
  }

  @pdfResponse({
    filename: (req) => `consentimiento-borrador-${String(req.params['templateId'])}.pdf`,
  })
  async printDraft(req: Request): Promise<any> {
    const user = (req as any).user as TokenPayload
    return this.service.printDraft(
      String(req.body?.patientId ?? ''),
      String(req.body?.doctorId ?? ''),
      req.body?.date ? String(req.body.date) : null,
      String(req.params['templateId']),
      user.codigoEmpresa,
    )
  }

  @asyncHandler()
  async uploadPhysical(req: Request): Promise<any> {
    const user = (req as any).user as TokenPayload
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) {
      throw Object.assign(new Error('Validation error'), {
        name: 'validation_errors',
        errors: [{ msg: "El archivo firmado es requerido (campo 'file')." }],
      })
    }

    return this.service.uploadPhysical(
      String(req.params['id']),
      String(req.params['instanceId']),
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      },
      user.codigoEmpresa,
      user.uid,
    )
  }
}
