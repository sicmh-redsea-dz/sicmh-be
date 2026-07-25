import { ResultSetHeader } from 'mysql2'
import { InventoryRepository } from '../../application/ports/inv.repository'
import { Database } from '../database/Database'
import { inventoryQueries } from '../database/queries/inv.queries'

export class MysqlInvRepository implements InventoryRepository {
    async findAll(pagination: { limit: number; offset: number; term: string }, subinvId: number): Promise<any[]> {
        const query = inventoryQueries('all-inv', { pagDelimeters: pagination })
        const termValues = pagination.term ? [pagination.term] : []
        return Database.execute<any[]>(query, [...termValues, subinvId])
    }

    async findById(id: string): Promise<any | null> {
        const query = inventoryQueries('inv-by-id')
        const result = await Database.execute<any[]>(query, [id])
        return result[0] ?? null
    }

    async transfer(data: { prodId: number; prodQty: number; fromLocId: number; toLocId: number }): Promise<any> {
        const query = inventoryQueries('inv-transfer-id', { transferArgs: data })
        return Database.execute<any>(query, [data.prodId, data.prodQty, data.fromLocId, data.toLocId])
    }

    async create(data: Record<string, any>): Promise<number> {
        const { query, values } = this.buildInsertQuery('Inventario', data)
        const resp = await Database.execute<ResultSetHeader>(query, values)
        const { insertId } = resp
        await Database.execute<ResultSetHeader>(
            `
                insert into ExistenciasInventario (ProductoID,SubinventarioID,Cantidad) values (?,?,?);
            `,
            [insertId, 1, data['Cantidad']]
        )
        return insertId
    }

    async update(id: number, data: Record<string, any>): Promise<number> {
        const { prodDesc, prodMinStock, prodName, prodQty, prodUnitPrice } = data
        const query = inventoryQueries('update')
        const updatedItem = await Database.execute<ResultSetHeader>(
            query,
            [prodName, prodDesc, prodUnitPrice, prodQty, prodMinStock, prodQty, id]
        )
        return updatedItem.affectedRows
    }

    private buildInsertQuery(table: string, data: Record<string, any>): { query: string; values: any[] } {
        const keys = Object.keys(data)
        const columns = keys.join(', ')
        const placeholders = keys.map(() => '?').join(', ')
        const values = keys.map((key) => data[key])

        const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders});`
        return { query, values }
    }
}
