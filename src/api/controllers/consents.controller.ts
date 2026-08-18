import { NextFunction, Request, Response } from 'express'
import { TokenPayload } from '../../utils/jwtUtils'
import { ServiceContainer } from '../../infrastructure/container/service.container'

export class ConsentsController {
  private get service() { return ServiceContainer.getConsentsService() }

  listTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ data: await this.service.listTemplates(req.query['includeInactive'] === 'true') }) } catch (err) { next(err) }
  }
  createTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      res.status(201).json({ data: await this.service.createTemplate(req.body?.name, req.body?.content, Number(user.uid)) })
    } catch (err) { next(err) }
  }
  updateTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      res.json({ data: await this.service.updateTemplate(Number(req.params['id']), req.body?.name, req.body?.content, Number(user.uid)) })
    } catch (err) { next(err) }
  }
  setTemplateActive = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ data: await this.service.setTemplateActive(Number(req.params['id']), !!req.body?.active) }) } catch (err) { next(err) }
  }
  listByVisit = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ data: await this.service.listByVisit(Number(req.params['id'])) }) } catch (err) { next(err) }
  }
  context = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      res.json({ data: await this.service.getContext(Number(req.params['id']), Number(req.params['templateId']), user.codigoEmpresa) })
    } catch (err) { next(err) }
  }
  draftContext = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      const data = await this.service.getDraftContext(Number(req.query['patientId']), Number(req.query['doctorId']), String(req.query['date'] ?? '') || null, Number(req.params['templateId']), user.codigoEmpresa)
      res.json({ data })
    } catch (err) { next(err) }
  }
  draftPrint = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      const pdf = await this.service.previewDraft(Number(req.body?.patientId), Number(req.body?.doctorId), String(req.body?.date ?? '') || null, Number(req.params['templateId']), user.codigoEmpresa)
      this.sendPdf(res, pdf, 'consentimiento-para-firma.pdf')
    } catch (err) { next(err) }
  }
  preview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      const pdf = await this.service.preview(Number(req.params['id']), Number(req.params['templateId']), user.codigoEmpresa)
      this.sendPdf(res, pdf, 'vista-previa-consentimiento.pdf')
    } catch (err) { next(err) }
  }
  print = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      const result = await this.service.markPrinted(Number(req.params['id']), Number(req.params['templateId']), user.codigoEmpresa, Number(user.uid), Number(req.body?.expectedTemplateVersion) || null)
      res.setHeader('X-Consent-Instance-Id', String(result.id))
      this.sendPdf(res, result.pdf, 'consentimiento-para-firma.pdf')
    } catch (err) { next(err) }
  }
  accept = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      const data = await this.service.acceptElectronic(Number(req.params['id']), Number(req.params['templateId']), user.codigoEmpresa, Number(user.uid), req.body ?? {})
      res.status(201).json({ data })
    } catch (err) { next(err) }
  }
  acceptPhysical = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as TokenPayload
      const file = (req as any).file as Express.Multer.File | undefined
      if (!file) throw Object.assign(new Error('Validation error'), { name: 'validation_errors', errors: [{ msg: 'El documento firmado es requerido.' }] })
      res.status(201).json({ data: await this.service.acceptPhysical(Number(req.params['instanceId']), user.codigoEmpresa, Number(user.uid), file) })
    } catch (err) { next(err) }
  }

  private sendPdf(res: Response, pdf: Buffer, filename: string) {
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    res.setHeader('Content-Length', String(pdf.length))
    res.end(pdf)
  }
}
