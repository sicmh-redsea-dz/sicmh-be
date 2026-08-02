import { and, eq, gte, inArray, isNull, sql, sum } from 'drizzle-orm'
import { StockRepository } from '../../application/ports/stock.repository'
import { Stock } from '../../domain/entities/Stock'
import { TenantContext } from '../database/TenantContext'
import {
  encounterProducts,
  inventoryLocations,
  inventoryStock,
  invoiceItems,
  products,
} from '../database/schema/tenant'

export class MysqlStockRepository implements StockRepository {
  async findAll(): Promise<Stock[]> {
    const rows = await TenantContext.getDb()
      .select({
        product: products,
        quantity: sum(inventoryStock.quantity),
      })
      .from(products)
      .leftJoin(inventoryStock, and(
        eq(products.id, inventoryStock.productId),
        isNull(inventoryStock.deletedAt),
      ))
      .where(isNull(products.deletedAt))
      .groupBy(products.id)
    return rows.map(({ product, quantity }) => ({
      ProductoID: product.id,
      NombreProducto: product.name,
      Descripcion: product.description ?? '',
      Cantidad: Number(quantity ?? 0),
      PrecioUnidad: product.unitPrice,
    }))
  }

  async readAmountByStockQty(items: { id: string; qty: number }[]): Promise<number> {
    if (!items.length) return 0
    const rows = await TenantContext.getDb()
      .select({ id: products.id, price: products.unitPrice })
      .from(products)
      .where(and(inArray(products.id, items.map((item) => item.id)), isNull(products.deletedAt)))
    const priceById = new Map(rows.map((row) => [row.id, Number(row.price)]))
    return items.reduce((total, item) => total + (priceById.get(item.id) ?? 0) * item.qty, 0)
  }

  async reduceStockQuantities(items: { id: string; qty: number; subinventoryId?: string }[]): Promise<void> {
    const db = TenantContext.getDb()
    await db.transaction(async (transaction) => {
      const defaultLocationId = await this.defaultLocationId()
      for (const item of items) {
        const locationId = item.subinventoryId ?? defaultLocationId
        const result = await transaction
          .update(inventoryStock)
          .set({ quantity: sql`${inventoryStock.quantity} - ${item.qty}` })
          .where(and(
            eq(inventoryStock.productId, item.id),
            eq(inventoryStock.locationId, locationId),
            gte(inventoryStock.quantity, item.qty),
            isNull(inventoryStock.deletedAt),
          ))
        if (result[0].affectedRows !== 1) {
          throw Object.assign(new Error(`Insufficient stock for product ${item.id}`), { name: 'validation_errors' })
        }
      }
    })
  }

  async restoreStockQuantities(items: { id: string; qty: number; subinventoryId?: string }[]): Promise<void> {
    const db = TenantContext.getDb()
    await db.transaction(async (transaction) => {
      const defaultLocationId = await this.defaultLocationId()
      for (const item of items) {
        const locationId = item.subinventoryId ?? defaultLocationId
        await transaction
          .insert(inventoryStock)
          .values({ productId: item.id, locationId, quantity: item.qty })
          .onDuplicateKeyUpdate({
            set: {
              quantity: sql`${inventoryStock.quantity} + ${item.qty}`,
              deletedAt: null,
            },
          })
      }
    })
  }

  async insertStockInvoice(invoiceId: string, items: { id: string; qty: number }[]): Promise<void> {
    if (!items.length) return
    const db = TenantContext.getDb()
    const productRows = await db.select().from(products).where(inArray(products.id, items.map((item) => item.id)))
    const productById = new Map(productRows.map((product) => [product.id, product]))
    await db.insert(invoiceItems).values(items.map((item) => {
      const product = productById.get(item.id)
      if (!product) throw new Error(`Product not found: ${item.id}`)
      const total = Number(product.unitPrice) * item.qty
      return {
        invoiceId,
        productId: item.id,
        category: 'insumo',
        description: product.name,
        quantity: item.qty,
        unitPrice: product.unitPrice,
        totalAmount: total.toFixed(2),
      }
    }))
  }

  async insertStockHistory(historyId: string, items: { id: string; qty: number }[]): Promise<void> {
    for (const item of items) {
      await TenantContext.getDb()
        .insert(encounterProducts)
        .values({ clinicalEncounterId: historyId, productId: item.id, quantity: item.qty })
        .onDuplicateKeyUpdate({
          set: { quantity: sql`${encounterProducts.quantity} + ${item.qty}`, deletedAt: null },
        })
    }
  }

  async findByInvoiceId(invoiceId: string): Promise<{ id: string; qty: number; name: string; unitPrice: number }[]> {
    const rows = await TenantContext.getDb()
      .select({
        id: products.id,
        qty: invoiceItems.quantity,
        name: invoiceItems.description,
        unitPrice: invoiceItems.unitPrice,
      })
      .from(invoiceItems)
      .innerJoin(products, eq(invoiceItems.productId, products.id))
      .where(and(eq(invoiceItems.invoiceId, invoiceId), isNull(invoiceItems.deletedAt)))
    return rows.map((row) => ({ ...row, unitPrice: Number(row.unitPrice) }))
  }

  private async defaultLocationId(): Promise<string> {
    const [location] = await TenantContext.getDb()
      .select({ id: inventoryLocations.id })
      .from(inventoryLocations)
      .where(and(eq(inventoryLocations.code, 'main'), isNull(inventoryLocations.deletedAt)))
      .limit(1)
    if (!location) throw new Error('Default inventory location is not configured.')
    return location.id
  }
}
