import { InventoryRepository } from '../ports/inv.repository'
import { InvMapper } from '../../domain/mappers/InvMapper'

interface Delimiters {
    limit: number,
    offset: number,
    term: string
}

export class InvService {
    constructor(private readonly invRepo: InventoryRepository) {}

    getInventory = async( pagParams: Delimiters, subinvId: number ): Promise<any> => {
        try {
            const resp = await this.invRepo.findAll( pagParams, subinvId )
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
        try {
            const resp = await this.invRepo.findById( id )
            if ( !resp )
                throw this.errorHandler('not_found_error', `No article found with Id: ${id}`)
            return InvMapper.toInvResponse( resp )
        } catch ( err: any ) { 
            console.log('the err :::: ', err.message)
            throw err
        } 
    }

    transferInventory = async( data: any ): Promise<any> => {
        try {
            return await this.invRepo.transfer( data )
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
        try {
            const insertId = await this.invRepo.create( translatedData )
            return this.getInventoryById( String( insertId ) )
        } catch ( err: any ) {
            console.log('the err :::: ', err.message)
            throw err
        }
    }

    patchArticle = async ( data: any, id: number ): Promise<any> => {
        try {
            const affectedRows = await this.invRepo.update( id, data )
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
}   
