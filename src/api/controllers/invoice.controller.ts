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
                            body {
                                font-family: Arial, sans-serif;
                                margin: 2cm;
                                font-size: 12px;
                            }

                            h1 {
                                text-align: center;
                                font-size: 18px;
                                margin-bottom: 1rem;
                            }

                            .section {
                                margin-bottom: 1.5rem;
                            }

                            .section-title {
                                font-weight: bold;
                                margin-bottom: 0.5rem;
                                text-decoration: underline;
                            }

                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-bottom: 0.5rem;
                            }

                            th, td {
                                border: 1px solid #999;
                                padding: 6px;
                                text-align: left;
                            }

                            .no-border td {
                                border: none;
                                padding: 4px;
                            }

                            .signature-line {
                                margin-top: 2rem;
                                display: flex;
                                justify-content: space-between;
                            }

                            .signature-line div {
                                width: 45%;
                                border-top: 1px solid #000;
                                text-align: center;
                                font-size: 11px;
                                padding-top: 0.2rem;
                            }
                        </style>
                    </head>
                    <body>
                        <h1>MedIT - Reporte de Cierre de Caja</h1>

                        <div class="section no-border">
                            <table class="no-border">
                            <tr><td>Fecha:</td><td>2025-07-20</td></tr>
                            <tr><td>Cajero/a:</td><td>Juan Pérez</td></tr>
                            <tr><td>Turno:</td><td>08:00 - 17:00</td></tr>
                            </table>
                        </div>

                        <div class="section">
                            <div class="section-title">Resumen de Ventas</div>
                            <table>
                            <thead>
                                <tr><th>Categoría</th><th>Cantidad</th><th>Total (L.)</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Citas programadas</td><td>24</td><td>5,800.00</td></tr>
                                <tr><td>Citas Emergencia</td><td>5</td><td>900.00</td></tr>
                                <tr><td>&nbsp;&nbsp;→ Tercera Edad</td><td>3</td><td>600.00</td></tr>
                                <tr><td>&nbsp;&nbsp;→ Otras Ofertas</td><td>2</td><td>300.00</td></tr>
                                <tr><td>Pagos Mixtos</td><td>4</td><td>1,200.00</td></tr>
                                <tr><td>Reembolsos</td><td>1</td><td>-150.00</td></tr>
                                <tr><td><strong>Total Neto</strong></td><td></td><td><strong>7,750.00</strong></td></tr>
                            </tbody>
                            </table>
                        </div>

                        <div class="section">
                            <div class="section-title">Detalle de Métodos de Pago</div>
                            <table>
                            <thead>
                                <tr><th>Método de Pago</th><th>Monto (L.)</th><th>Notas</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Efectivo</td><td>4,000.00</td><td></td></tr>
                                <tr><td>Tarjeta</td><td>2,300.00</td><td></td></tr>
                                <tr><td>Transferencia</td><td>950.00</td><td></td></tr>
                                <tr><td>Mixto</td><td>1,200.00</td><td>dividido por método</td></tr>
                            </tbody>
                            </table>
                        </div>

                        <div class="section">
                            <div class="section-title">Caja y Reconciliación</div>
                            <table>
                            <thead>
                                <tr>
                                <th>Descripción</th><th>Total del Sistema</th><th>Conteo Manual</th><th>Diferencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>Efectivo en Caja</td><td>4,000.00</td><td></td><td></td></tr>
                                <tr><td>Recibos de Tarjeta</td><td>2,300.00</td><td></td><td></td></tr>
                                <tr><td>Transferencias Verificadas</td><td>950.00</td><td></td><td></td></tr>
                                <tr><td><strong>Diferencia Total</strong></td><td></td><td></td><td></td></tr>
                            </tbody>
                            </table>
                        </div>

                        <div class="section">
                            <div class="section-title">Observaciones</div>
                            <p>[Diferencias, explicaciones o incidencias observadas]</p>
                        </div>

                        <div class="signature-line">
                            <div>Firma Cajero/a</div>
                            <div>Firma Supervisor/a</div>
                        </div>
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

}