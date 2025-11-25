import { Database } from '../../infrastructure/database/Database'
import { inventoryQueries } from '../../infrastructure/database/queries/inv.queries'
import { InvMapper } from '../mappers/InvMapper'

interface Delimiters {
    limit: number,
    offset: number,
    term: string
}

export class InvService {
    getInventory = async( pagParams: Delimiters, subinvId: number ): Promise<any> => {
        let invQ = inventoryQueries( 'all-inv', { pagDelimeters: pagParams } )

        try {
            const resp = await Database.execute<any>( invQ, [ subinvId ])
            const totalRegistries = resp.length > 0 ? resp[0].total_registries : 0
            return {
                resp: resp.map(( item: any ) => InvMapper.toInvResponse( item )),
                totalRegistries
            }
        } catch ( err: any ) {
            console.log('the err :::: ', err.message)
            throw err
        }   
    }

    getInventoryById = async( id:string ): Promise<any> => {
        let invQ = inventoryQueries( 'inv-by-id' )
        try {
            const resp = await Database.execute<any>( invQ, [ id ])
            return InvMapper.toInvResponse( resp[0] )
        } catch ( err: any ) { 
            console.log('the err :::: ', err.message)
            throw err
        } 
    }

    transferInventory = async( data: any ): Promise<any> => {

        let invQ = inventoryQueries( 'inv-transfer-id', { transferArgs: data } )

        try {
            const resp = await Database.execute<any>( invQ, [ data ])
            return resp
        } catch ( err: any ) {
            console.log('the err :::: ', err.message)
            throw err
        }
    }
}   