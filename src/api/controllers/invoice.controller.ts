import { Request } from "express"
import { ServiceContainer } from "../../infrastructure/container/service.container"
import { InvoiceService } from "../../application/services/invoice.service"
import { asyncHandler, pdfResponse } from "../decorators/asyncHandler"

export class InvoiceController {

    private invoiceService: InvoiceService
    
    constructor() {
        this.invoiceService = ServiceContainer.getInvoiceService()
    }

    @asyncHandler()
    async read( req:Request ): Promise<any> {
        const limit = Number(req.query.limit) || 25
        const offset = Number(req.query.offset) || 0
        const term = String(req.query.term) || ''

        return this.invoiceService.getInvoices({limit, offset, term})
    }

    @asyncHandler()
    async create( req: Request ): Promise<any> {
        const { body } = req
        return this.invoiceService.createInvoice( body )
    }

    @asyncHandler()
    async rawData(): Promise<any> {
        return this.invoiceService.getRawData()
    }

    @asyncHandler()
    async readOne( req: Request ): Promise<any> {
        const { id } = req.params
        return this.invoiceService.getInvById( id )
    }

    @asyncHandler()
    async updateOne( req: Request ): Promise<any> {
        const { params, body } = req
        const { id } = params
        return this.invoiceService.updateInvById( id, body )
    }

    @asyncHandler()
    async annulOne( req: Request ): Promise<any> {
        const { id } = req.params
        return this.invoiceService.annulInvoiceById( id )
    }

    @asyncHandler()
    async removeOne( req: Request ): Promise<any> {
        const { id } = req.params
        return this.invoiceService.removeInvoiceById( id )
    }

    @pdfResponse({
        filename: (req) => {
            const term = String(req.params.term ?? '')
            return `reporte-facturas${term ? `-${term}` : ''}.pdf`
        }
    })
    async generatePDF( req: Request ): Promise<any> {
        const { term } = req.params
        return this.invoiceService.generateCloseReportPdf(term)
    }
}
