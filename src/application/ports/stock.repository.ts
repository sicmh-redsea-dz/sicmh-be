import { Stock } from '../../domain/entities/Stock'

export interface StockRepository {
    findAll(): Promise<Stock[]>
    readAmountByStockQty(items: { id: number; qty: number }[]): Promise<number>
    reduceStockQuantities(items: { id: number; qty: number; subinventoryId?: number }[]): Promise<void>
    insertStockInvoice(invoiceId: number, items: { id: number; qty: number }[]): Promise<void>
    insertStockHistory(historyId: number, items: { id: number; qty: number }[]): Promise<void>
}
