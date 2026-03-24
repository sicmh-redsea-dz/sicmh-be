import { StockRepository } from '../../application/ports/stock.repository'
import { Stock } from '../../domain/entities/Stock'
import { Database } from '../database/Database'
import { stockQueries } from '../database/queries/stock.queries'

export class MysqlStockRepository implements StockRepository {
    async findAll(): Promise<Stock[]> {
        const query = stockQueries('find-all')
        return Database.execute<Stock[]>(query)
    }

    async readAmountByStockQty(items: { id: number; qty: number }[]): Promise<number> {
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

        const result = await Database.execute<{ total: number }[]>(query)
        return result[0]?.total ?? 0.00
    }

    async reduceStockQuantities(
        items: { id: number; qty: number; subinventoryId?: number }[]
    ): Promise<void> {
        if (!items.length) return

        const defaultSubinventoryId = 1
        const promises = items.map(item => {
            const subinvOrigen = item.subinventoryId ?? defaultSubinventoryId
            const query = `CALL sp_mov_inventario(?, ?, ?, ?, ?);`
            const values = [
                'SALIDA',
                item.id,
                item.qty,
                subinvOrigen,
                null
            ]

            return Database.execute(query, values)
        })

        await Promise.all(promises)
    }

    async insertStockInvoice(invoiceId: number, items: { id: number; qty: number }[]): Promise<void> {
        if (!items.length) return

        const values = items
            .map(({ id, qty }) => `(${invoiceId}, ${id}, ${qty})`)
            .join(', ')

        const query = `
            insert into Factura_Inventario (FacturaID, ProductoID, Cantidad)
            values ${values}
        `

        await Database.execute(query)
    }

    async insertStockHistory(historyId: number, items: { id: number; qty: number }[]): Promise<void> {
        if (!items.length) return

        const values = items
            .map(({ id, qty }) => `(${id}, ${historyId}, ${qty})`)
            .join(', ')
        
        const query = `
            insert into Inventario_HistoriaMedica (InventarioID, HistoriaMedicaID, CantidadUsada)
            values ${values}
        `
            
        await Database.execute(query)
    }

    async findByInvoiceId(invoiceId: number): Promise<{ id: number; qty: number; name: string; unitPrice: number }[]> {
        const query = `
            select 
                fi.ProductoID as id,
                fi.Cantidad as qty,
                inv.NombreProducto as name,
                inv.PrecioUnidad as unitPrice
            from Factura_Inventario as fi
            inner join Inventario as inv
                on inv.ProductoID = fi.ProductoID
            where fi.FacturaID = ?;
        `
        return Database.execute<any[]>(query, [invoiceId])
    }
}
