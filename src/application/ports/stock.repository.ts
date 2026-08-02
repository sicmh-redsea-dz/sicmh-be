import { Stock } from '../../domain/entities/Stock'

export interface StockRepository {
    findAll(): Promise<Stock[]>
    readAmountByStockQty(items: { id: string; qty: number }[]): Promise<number>
    reduceStockQuantities(items: { id: string; qty: number; subinventoryId?: string }[]): Promise<void>
    restoreStockQuantities(items: { id: string; qty: number; subinventoryId?: string }[]): Promise<void>
    insertStockInvoice(invoiceId: string, items: { id: string; qty: number }[]): Promise<void>
    insertStockHistory(historyId: string, items: { id: string; qty: number }[]): Promise<void>
    findByInvoiceId(invoiceId: string): Promise<{ id: string; qty: number; name: string; unitPrice: number }[]>
}
