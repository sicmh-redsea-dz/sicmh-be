import { Database } from '../../infrastructure/database/Database'
import { inventoryQueries } from '../../infrastructure/database/queries/inv.queries'
import { InvMapper } from '../mappers/InvMapper'

interface Delimiters {
    limit: number,
    offset: number,
    term: string
}

export class InvService {
    getInventory = async( params: Delimiters ): Promise<any> => {
        let invQ = inventoryQueries( 'all-inv', params )
        try {
            const resp = await Database.execute<any>( invQ )
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
}   