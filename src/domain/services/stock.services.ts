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

    reduceStockQuantities = async (
        items: { 
            id: number; 
            qty: number, 
            subinventoryId?:number 
        }[]
    ): Promise<void> => {
        if (!items.length) return;

        // ID del subinventario "General" o el que quieras como default
        const DEFAULT_SUBINVENTARIO_ID = 1; 

        try {
            const promises = items.map(item => {
                const subinvOrigen = item.subinventoryId ?? DEFAULT_SUBINVENTARIO_ID;
                const query = `CALL sp_mov_inventario(?, ?, ?, ?, ?);`;
                const values = [
                    'SALIDA',    
                    item.id,     
                    item.qty,    
                    subinvOrigen,
                    null         
                ];

                return Database.execute(query, values);
            });

            await Promise.all(promises);
        } catch (err) {
            console.error('error reducing stock quantities: ', err);
            throw err;
        }
    }

    insertStockInvoice = async (facturaId: number, items: { id: number; qty: number }[]): Promise<void> => {
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

    insertStockHistory = async ( historyId: number, items: { id: number; qty: number }[] ): Promise<void> => {
        if ( !items.length ) return

        const values = items
            .map(({ id, qty }) => `(${id}, ${historyId}, ${qty})`)
            .join(', ')
        
        const query = `
            insert into Inventario_HistoriaMedica (InventarioID, HistoriaMedicaID, CantidadUsada)
            values ${values}
        `
            
        try {

            await Database.execute( query )

        } catch ( err: any ) {
            console.log('error inserting stock history: ', err.message)
            throw err
        }
    }

}