import { Request } from 'express';
import { VisitsService } from '../../domain/services/visits.service';
import { asyncHandler } from '../decorators/asyncHandler';
import { ServiceContainer } from '../../domain/services/container/service.container';



export class VisitsController {
    private visitsService: VisitsService

    constructor() {
        this.visitsService = ServiceContainer.getVisitsService()
    }

    @asyncHandler()
    async getVisits(): Promise<any> {
        return this.visitsService.findAllVisits()
    }

    @asyncHandler()
    async getVisit(req:Request): Promise<any> {
        const { id } = req.params
        return this.visitsService.findVisitById( +id )
    }

    @asyncHandler()
    async createVisit(req:Request) {
        const { body } = req
        return this.visitsService.createVisit( body )
    }

    @asyncHandler()
    async editVisit(req:Request) {
        const { body, params } = req
        return this.visitsService.editVisit({ id: params.id, body })
    }

    @asyncHandler()
    async deleteVisit(req:Request) {
        const { id } = req.params
        return this.visitsService.deleteVisit( +id )
    }
}