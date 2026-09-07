import { Request } from 'express'
import { asyncHandler, pdfResponse } from '../decorators/asyncHandler'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { BillingService } from '../../application/services/billing.service'

export class BillingController {
  private readonly billingService: BillingService

  constructor() {
    this.billingService = ServiceContainer.getBillingService()
  }

  @asyncHandler()
  async getReport(req: Request): Promise<any> {
    const filters = {
      from: this.readQueryString(req, 'from'),
      to: this.readQueryString(req, 'to'),
      station: this.readQueryString(req, 'station'),
      status: this.readQueryString(req, 'status'),
      patientIds: this.parseIds(req.query.patients ?? req.query.patientIds)
    }

    return this.billingService.getReport(filters)
  }

  @asyncHandler()
  async createMovement(req: Request): Promise<any> {
    const actor = this.resolveActor(req)
    return this.billingService.createMovement(req.body, actor)
  }

  @asyncHandler()
  async createManualCharge(req: Request): Promise<any> {
    return this.billingService.createManualCharge(req.body)
  }

  @asyncHandler()
  async getInvoiceSnapshot(req: Request): Promise<any> {
    const { invoiceNumber } = req.params
    return this.billingService.getInvoiceSnapshot(invoiceNumber)
  }

  @asyncHandler()
  async updateManualCharge(req: Request): Promise<any> {
    const { id } = req.params
    return this.billingService.updateManualCharge(id, req.body)
  }

  @asyncHandler()
  async deleteManualCharge(req: Request): Promise<any> {
    const { id } = req.params
    return this.billingService.removeManualCharge(id)
  }

  @pdfResponse({
    filename: (req) => {
      const from = String(req.query['from'] ?? 'desde')
      const to = String(req.query['to'] ?? 'hasta')
      return `reporte-facturacion-${from}-${to}.pdf`
    },
  })
  async generatePdf(req: Request): Promise<any> {
    const filters = {
      from: this.readQueryString(req, 'from'),
      to: this.readQueryString(req, 'to'),
      station: this.readQueryString(req, 'station'),
      status: this.readQueryString(req, 'status'),
      patientIds: this.parseIds(req.query.patients ?? req.query.patientIds)
    }
    return this.billingService.generateReportPdf(filters)
  }

  private parseIds(value: unknown): string[] {
    if (!value) return []
    if (Array.isArray(value)) {
      return value
        .flatMap((entry) => String(entry).split(','))
        .map((entry) => entry.trim())
        .filter(Boolean)
    }
    return String(value)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  private readQueryString(req: Request, key: string): string | undefined {
    const value = req.query[key]
    if (!value) return undefined
    return String(value)
  }

  private resolveActor(req: Request) {
    const user = (req as any).currentUser
    if (!user) return undefined
    return { id: user._id, name: user.name, role: user.roles?.[0] }
  }
}
