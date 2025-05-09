import { Database } from '../../infrastructure/database/Database'
import { StockMapper } from '../mappers/StockMapper'
import { Stock } from '../entities/Stock'
import { stockQueries } from '../../infrastructure/database/queries/stock.queries'

export class StockService {
    findAll = async ():Promise<any> => {
        const stockQ = stockQueries( 'find-all' )
        try {
            const stock = await Database.execute<Stock[]>( stockQ )
            return stock.map( item => StockMapper.toStockResponse( item ))
        } catch ( err ) {
            throw err
        }
    }
}