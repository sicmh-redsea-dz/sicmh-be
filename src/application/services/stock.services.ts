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

    readAmountByStockQty = async(items: { id: string; qty: number }[]): Promise<any> => {
        try {
            return await this.stockRepo.readAmountByStockQty( items )
        } catch ( err: any ) {
            throw err
        }
    }

    reduceStockQuantities = async (
        items: { 
            id: string; 
            qty: number, 
            subinventoryId?:string 
        }[]
    ): Promise<void> => {
        try {
            await this.stockRepo.reduceStockQuantities( items )
        } catch (err) {
            console.error('error reducing stock quantities: ', err);
            throw err;
        }
    }

    restoreStockQuantities = async (
        items: {
            id: string;
            qty: number,
            subinventoryId?:string
        }[]
    ): Promise<void> => {
        try {
            await this.stockRepo.restoreStockQuantities( items )
        } catch (err) {
            console.error('error restoring stock quantities: ', err);
            throw err;
        }
    }

    insertStockInvoice = async (facturaId: string, items: { id: string; qty: number }[]): Promise<void> => {
        try {
            await this.stockRepo.insertStockInvoice( facturaId, items )
        } catch (err) {
            throw err
        }
    }

    insertStockHistory = async ( historyId: string, items: { id: string; qty: number }[] ): Promise<void> => {
        try {
            await this.stockRepo.insertStockHistory( historyId, items )
        } catch ( err: any ) {
            console.log('error inserting stock history: ', err.message)
            throw err
        }
    }

    findInvoiceItems = async ( invoiceId: string ): Promise<{ id: string; qty: number; name: string; unitPrice: number }[]> => {
        try {
            return await this.stockRepo.findByInvoiceId(invoiceId)
        } catch ( err ) {
            throw err
        }
    }

    copyInvoiceItems = async ( fromInvoiceId: string, toInvoiceId: string ) => {
        const items = await this.findInvoiceItems(fromInvoiceId)
        if (!items.length) return { items: [], amount: 0 }

        await this.stockRepo.insertStockInvoice(
            toInvoiceId,
            items.map((item) => ({ id: item.id, qty: item.qty }))
        )

        const amount = await this.readAmountByStockQty(
            items.map((item) => ({ id: item.id, qty: item.qty }))
        )

        return { items, amount }
    }

}
