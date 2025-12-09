import { ResultSetHeader } from 'mysql2'
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

    create = async( data: any ): Promise<any> => {
        const translatedData = InvMapper.toInvFormResponse( data )
        translatedData['PrecioUnidad'] = Number(translatedData['PrecioUnidad'])
        translatedData['NivelMinimoStock'] = Number(translatedData['NivelMinimoStock'])
        translatedData['Cantidad'] = Number(translatedData['Cantidad'])
        const { query, values } = this.buildInsertQuery('Inventario', translatedData)
        try {
            const resp = await Database.execute<ResultSetHeader>( query, values )
            const { insertId } = resp
            await Database.execute<ResultSetHeader>(
                `
                    insert into ExistenciasInventario (ProductoID,SubinventarioID,Cantidad) values (?,?,?);
                `,
                [insertId,1,translatedData['Cantidad']]
            )
            return this.getInventoryById( String( insertId ) )
        } catch ( err: any ) {
            console.log('the err :::: ', err.message)
            throw err
        }
    }

    patchArticle = async ( data: any, id: number ): Promise<any> => {
        const { prodDesc, prodMinStock, prodName, prodQty, prodUnitPrice } = data
        const query = inventoryQueries( 'update' )
        try {
            let updatedItem = await Database.execute<ResultSetHeader>( query, [prodName, prodDesc, prodUnitPrice, prodQty, prodMinStock, prodQty, id])
            const { affectedRows } = updatedItem
            if ( affectedRows === 0)
                throw this.errorHandler('not_found_error', `No article found with Id: ${id}, to update`)
            return await this.getInventoryById( String(id) )
        } catch ( err: any ) {
            console.log('the err :::: ', err.message)
            throw err
        }

    }

    private errorHandler = (name:string, msg:string) => {
        const err = new Error()
        err.name = name
        err.message = msg
        return err
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