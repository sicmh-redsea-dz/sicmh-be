import { NextFunction, Request, Response } from "express"
import { ServiceContainer } from "../../infrastructure/container/service.container"
import { InvoiceService } from "../../application/services/invoice.service"
import { asyncHandler } from "../decorators/asyncHandler"

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

    @asyncHandler()
    async generatePDF( req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            const { term } = req.params
            const pdfBuffer = await this.invoiceService.generateCloseReportPdf(term)
            const filename = `reporte-facturas${term ? `-${term}` : '' }.pdf`
            res.writeHead( 200, {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": pdfBuffer.length,
            })
            res.end(pdfBuffer);
        } catch ( err ) {
            next( err )
        }
    }
}
