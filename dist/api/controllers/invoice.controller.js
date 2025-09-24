"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceController = void 0;
const service_container_1 = require("../../domain/services/container/service.container");
const asyncHandler_1 = require("../decorators/asyncHandler");
const puppeteer_1 = __importDefault(require("puppeteer"));
class InvoiceController {
    constructor() {
        this.invoiceService = service_container_1.ServiceContainer.getInvoiceService();
    }
    async read(req) {
        const limit = Number(req.query.limit) || 25;
        const offset = Number(req.query.offset) || 0;
        const term = String(req.query.term) || '';
        return this.invoiceService.getInvoices({ limit, offset, term });
    }
    async create(req) {
        const { body } = req;
        return this.invoiceService.createInvoice(body);
    }
    async rawData() {
        return this.invoiceService.getRawData();
    }
    async readOne(req) {
        const { id } = req.params;
        return this.invoiceService.getInvById(id);
    }
    async updateOne(req) {
        const { params, body } = req;
        const { id } = params;
        return this.invoiceService.updateInvById(id, body);
    }
    async removeOne(req) {
        const { id } = req.params;
        return this.invoiceService.removeInvoiceById(id);
    }
    async generatePDF(_req, res, next) {
        try {
            const browser = await puppeteer_1.default.launch({
                headless: true,
                args: ['--no-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            * {
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                                font-family: 'Roboto', sans-serif;
                            }

                            body {
                                margin: 2cm;
                                font-size: 12px;
                            }

                            h1 {
                                text-align: left;
                                font-size: 2rem;
                                font-weight: 500;
                                margin-bottom: 1rem;
                                color: #17365D;
                            }

                            .divider {
                                border-top: 2px solid #B1C7E2;
                                margin: 1rem 0 2rem 0;
                            }

                            .section {
                                margin-bottom: 1.5rem;
                            }

                            .section.no-border .info-pair {
                                display: flex;
                                margin-bottom: 4px;
                                font-size: 16px;
                            }

                            .section.no-border .label {
                                margin-right: 16px;
                            }


                            .section.no-border .value {
                                font-weight: bold;
                                text-align: right;
                            }

                            .section-title {
                                font-weight: bold;
                                margin-bottom: 0.5rem;
                                text-decoration: underline;
                                font-size: 16px;
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
                                font-size: 14px;
                            }

                            .no-border td {
                                border: none;
                                padding: 4px;
                            }


                            .signature-line {
                                margin-top: 4rem;
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

                        <div class="divider"></div>

                        <div class="section no-border">
                            <div class="info-pair"><span class="label" style="margin-right: 34px;">Fecha:</span><span class="value">2025-07-20</span></div>
                            <div class="info-pair"><span class="label">Cajero/a:</span><span class="value">Juan Pérez</span></div>
                            <div class="info-pair"><span class="label" style="margin-right: 34px;">Turno:</span><span class="value">08:00 - 17:00</span></div>
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
            });
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
            await browser.close();
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="reporte-facturas.pdf"',
                'Content-Length': pdfBuffer.length
            });
            res.end(pdfBuffer);
        }
        catch (err) {
            console.log('error al generar pdf ::::: ', err.message);
            next(err);
        }
    }
}
exports.InvoiceController = InvoiceController;
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "read", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "create", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "rawData", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "readOne", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "updateOne", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "removeOne", null);
