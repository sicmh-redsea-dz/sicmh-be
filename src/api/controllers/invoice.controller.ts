import { Request } from "express"
import { ServiceContainer } from "../../domain/services/container/service.container"
import { InvoiceService } from "../../domain/services/invoice.service"
import { asyncHandler } from "../decorators/asyncHandler"

export class InvoiceController {

    private invoiceService: InvoiceService
    
    constructor() {
        this.invoiceService = ServiceContainer.getInvoiceService()
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

}