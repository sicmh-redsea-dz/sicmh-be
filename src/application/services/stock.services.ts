import { StockRepository } from '../ports/stock.repository'
import { StockMapper } from '../../domain/mappers/StockMapper'

export class StockService {
    constructor(private readonly stockRepo: StockRepository) {}

    findAll = async ():Promise<any> => {
        try {
            const stock = await this.stockRepo.findAll()
            return stock.map( item => StockMapper.toStockResponse( item ))
        } catch ( err ) {
            throw err
        }
    }

    readAmountByStockQty = async(items: { id: number; qty: number }[]): Promise<any> => {
        try {
            return await this.stockRepo.readAmountByStockQty( items )
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
        try {
            await this.stockRepo.reduceStockQuantities( items )
        } catch (err) {
            console.error('error reducing stock quantities: ', err);
            throw err;
        }
    }

    insertStockInvoice = async (facturaId: number, items: { id: number; qty: number }[]): Promise<void> => {
        try {
            await this.stockRepo.insertStockInvoice( facturaId, items )
        } catch (err) {
            throw err
        }
    }

    insertStockHistory = async ( historyId: number, items: { id: number; qty: number }[] ): Promise<void> => {
        try {
            await this.stockRepo.insertStockHistory( historyId, items )
        } catch ( err: any ) {
            console.log('error inserting stock history: ', err.message)
            throw err
        }
    }

}
