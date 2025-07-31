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

    readAmountByStockQty = async(items: { id: number; qty: number }[]): Promise<any> => {
        const ids = items.map(item => item.id)
        const caseStatements = items
            .map(item => `WHEN ${item.id} THEN ${item.qty}`)
            .join(' ')

        const query = `
            select sum(PrecioUnidad * case ProductoID
                ${caseStatements}
                else 0
                end) AS total
            from 
                Inventario
            where 
                ProductoID in (${ids.join(', ')});
        `

        try {
            const result = await Database.execute<{ total: number }[]>(query);
            return result[0]?.total ?? 0.00
        } catch ( err: any ) {
            throw err
        }
    }

    reduceStockQuantities = async(items: { id: number; qty: number }[]): Promise<void> => {
        const ids = items.map(item => item.id);
        const caseStatements = items
        .map(item => `when ${item.id} then Cantidad - ${item.qty}`)
        .join(' ');

        const query = `
            update Inventario
            set Cantidad = case ProductoID
                ${caseStatements}
                else Cantidad
            end
            where ProductoID in (${ids.join(', ')});
        `

        try {

            await Database.execute<Stock[]>( query )
            
        } catch ( err ) {
            throw err
        }
    }

    insertInvoiceStock = async (facturaId: number, items: { id: number; qty: number }[]): Promise<void> => {
        if (!items.length) return

        const values = items
            .map(({ id, qty }) => `(${facturaId}, ${id}, ${qty})`)
            .join(', ')

        const query = `
            insert into Factura_Inventario (FacturaID, ProductoID, Cantidad)
            values ${values}
        `

        try {

            await Database.execute(query)

        } catch (err) {
            throw err
        }
    }

}