import { Request } from 'express';
import { VisitsService } from '../../application/services/visits.service';
import { asyncHandler } from '../decorators/asyncHandler';
import { ServiceContainer } from '../../infrastructure/container/service.container';
import { TokenPayload } from '../../utils/jwtUtils';



export class VisitsController {
    private readonly visitsService: VisitsService

    constructor() {
        this.visitsService = ServiceContainer.getVisitsService()
    }

    @asyncHandler()
    async getVisits(req:Request): Promise<any> {
        const limit = Number(req.query.limit) || 25
        const offset = Number(req.query.offset) || 0
        const term = String(req.query.term) || ''
        const ext = String ( req.query.ext ) || ''

        return this.visitsService.findAllVisits({ limit, offset, term, ext })
    }

    @asyncHandler()
    async getVisit(req:Request): Promise<any> {
        const { id } = req.params
        return this.visitsService.findVisitById( +id )
    }

    @asyncHandler()
    async getPrescription(req: Request): Promise<any> {
        const user = (req as any).user as TokenPayload
        return this.visitsService.getPrescriptionContext(Number(req.params['id']), user.codigoEmpresa)
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

    @asyncHandler()
    async getDoctors( req:Request ) {
        const term = String(req.query.term ?? '').trim()
        return this.visitsService.getDoctors( term )
    }

    @asyncHandler()
    async getPatients( req:Request ) {
        const term = String(req.query.term ?? '').trim()
        if (term.length < 2) return { patients: [] }
        return this.visitsService.getPatients( term )
    }

    @asyncHandler()
    async getStockItems( req:Request ) {
        const term = req.query.term || ''

        return this.visitsService.getStockItems( +term )
    }
}
