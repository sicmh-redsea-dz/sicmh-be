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
exports.VisitsController = void 0;
const asyncHandler_1 = require("../decorators/asyncHandler");
const service_container_1 = require("../../domain/services/container/service.container");
class VisitsController {
    constructor() {
        this.visitsService = service_container_1.ServiceContainer.getVisitsService();
    }
    async getVisits(req) {
        const limit = Number(req.query.limit) || 25;
        const offset = Number(req.query.offset) || 0;
        const term = String(req.query.term) || '';
        const def = req.query.default === 'false' ? false : true;
        return this.visitsService.findAllVisits({ limit, offset, term, def });
    }
    async getVisit(req) {
        const { id } = req.params;
        return this.visitsService.findVisitById(+id);
    }
    async createVisit(req) {
        const { body } = req;
        return this.visitsService.createVisit(body);
    }
    async editVisit(req) {
        const { body, params } = req;
        return this.visitsService.editVisit({ id: params.id, body });
    }
    async deleteVisit(req) {
        const { id } = req.params;
        return this.visitsService.deleteVisit(+id);
    }
    async getDoctors(req) {
        const term = String(req.query.term) || '';
        if (term.trim().length === 0)
            return;
        return this.visitsService.getDoctors(term);
    }
    async getPatients(req) {
        const term = String(req.query.term) || '';
        if (term.trim().length === 0)
            return;
        return this.visitsService.getPatients(term);
    }
}
exports.VisitsController = VisitsController;
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VisitsController.prototype, "getVisits", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VisitsController.prototype, "getVisit", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VisitsController.prototype, "createVisit", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VisitsController.prototype, "editVisit", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VisitsController.prototype, "deleteVisit", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VisitsController.prototype, "getDoctors", null);
__decorate([
    (0, asyncHandler_1.asyncHandler)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VisitsController.prototype, "getPatients", null);
