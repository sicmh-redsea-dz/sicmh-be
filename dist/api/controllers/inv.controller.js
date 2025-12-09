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
exports.InvController = void 0;
const service_container_1 = require("../../domain/services/container/service.container");
const asyncHandler_1 = require("../decorators/asyncHandler");
class InvController {
    constructor() {
        this.invService = service_container_1.ServiceContainer.getInvService();
    }
    getInventory(req) {
        const limit = Number(req.query.limit) || 25;
        const offset = Number(req.query.offset) || 0;
        const term = String(req.query.term) || '';
        const subinvId = Number(req.query.subinvId) || 1;
        const paginationTerms = { limit, offset, term };
        return this.invService.getInventory(paginationTerms, subinvId);
    }
    getInventoryById(req) {
        const id = req.params.id;
        return this.invService.getInventoryById(id);
    }
    transferInventory(req) {
        const data = req.body;
        const { itemId, subinv, qty, origin } = data;
        return this.invService.transferInventory({
            prodId: itemId,
            prodQty: Number(qty),
            fromLocId: origin,
            toLocId: Number(subinv)
        });
    }
    createArticle(req) {
        const body = req.body;
        return this.invService.create(body);
    }
    patchArticle(req) {
        const { id } = req.params;
        const body = req.body;
        return this.invService.patchArticle(body, Number(id));
    }
}
exports.InvController = InvController;
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvController.prototype, "getInventory", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvController.prototype, "getInventoryById", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InvController.prototype, "transferInventory", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InvController.prototype, "createArticle", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InvController.prototype, "patchArticle", null);
