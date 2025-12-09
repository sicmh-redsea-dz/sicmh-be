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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceController = void 0;
const service_container_1 = require("../../domain/services/container/service.container");
const asyncHandler_1 = require("../decorators/asyncHandler");
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
    async generatePDF(req, res, next) {
        try {
            const { term } = req.params;
            const pdfBuffer = await this.invoiceService.generateCloseReportPdf(term);
            const filename = `reporte-facturas${term ? `-${term}` : ''}.pdf`;
            res.writeHead(200, {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": pdfBuffer.length,
            });
            res.end(pdfBuffer);
        }
        catch (err) {
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
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Function]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "generatePDF", null);
