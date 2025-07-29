import { NextFunction, Request, Response } from "express"
import { ServiceContainer } from "../../domain/services/container/service.container"
import { InvoiceService } from "../../domain/services/invoice.service"
import { asyncHandler } from "../decorators/asyncHandler"
import puppeteer from "puppeteer"
import * as fs from 'fs';

export class InvoiceController {

    private invoiceService: InvoiceService
    
    constructor() {
        this.invoiceService = ServiceContainer.getInvoiceService()
    }

    async generatePDF( req: Request, res: Response, next: NextFunction ): Promise<any> {
        try {
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox']
            })

            const page = await browser.newPage()

            await page.setContent(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: Arial, sans-serif; margin: 2cm; }
                            h1 { color: #333; }
                        </style>
                    </head>
                    <body>
                        <h1>Reporte de Facturas Salus</h1>
                        <p>Fecha de generación: ${new Date().toLocaleDateString()}</p>
                    </body>
                </html>
            `, {
                waitUntil: 'networkidle0'
            })

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                // margin: {
                //     top: '2cm',
                //     right: '2cm',
                //     bottom: '2cm',
                //     left: '2cm'
                // }
            });

            await browser.close()

            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="reporte-facturas.pdf"',
                'Content-Length': pdfBuffer.length
            })

            res.end( pdfBuffer )
        } catch ( err: any ) {
            console.log('error al generar pdf ::::: ', err.message)
            next( err )
        }
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
    async removeOne( req: Request ): Promise<any> {
        const { id } = req.params
        return this.invoiceService.removeInvoiceById( id )
    }

}