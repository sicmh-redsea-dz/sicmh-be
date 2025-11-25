import { Request } from 'express'
import { ServiceContainer } from '../../domain/services/container/service.container'
import { InvService } from '../../domain/services/inv.service'
import { asyncHandler } from '../decorators/asyncHandler'

export class InvController {
    private readonly invService: InvService

    constructor() {
        this.invService = ServiceContainer.getInvService()
    }

    @asyncHandler()
    getInventory( req: Request): Promise< any > {
        const limit = Number(req.query.limit) || 25
        const offset = Number(req.query.offset) || 0
        const term = String(req.query.term) || ''
        const subinvId = Number(req.query.subinvId) || 1

        const paginationTerms = { limit, offset, term }
        return this.invService.getInventory( paginationTerms, subinvId )
    }

    @asyncHandler()
    getInventoryById( req: Request): Promise< any > {
        const id = req.params.id
        
        return this.invService.getInventoryById( id )
    }

    @asyncHandler()
    transferInventory( req: Request ) {
        const data = req.body
        const { itemId, subinv, qty, origin } = data

        return this.invService.transferInventory({
            prodId: itemId,
            prodQty: Number( qty ),
            fromLocId: origin,
            toLocId: Number( subinv )
        })
    }
}