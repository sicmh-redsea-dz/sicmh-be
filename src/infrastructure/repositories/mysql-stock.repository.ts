import { and, desc, eq, inArray, isNull, sql, sum } from 'drizzle-orm'
import { StockRepository } from '../../application/ports/stock.repository'
import { Stock } from '../../domain/entities/Stock'
import { changeInventory, inventoryLocationId, requireQuantity, returnEncounterInventory } from './inventory-balances'
import { TenantContext } from '../database/TenantContext'
import {
  encounterProducts,
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
    items.forEach(item => requireQuantity(item.qty))
    const rows = await TenantContext.getDb()
      .select({ id: products.id, price: products.unitPrice })
      .from(products)
      .where(and(inArray(products.id, items.map((item) => item.id)), isNull(products.deletedAt)))
    if (new Set(items.map(item => item.id)).size !== rows.length) throw Object.assign(new Error('Uno o más productos no existen.'), { name: 'validation_errors' })
    const priceById = new Map(rows.map((row) => [row.id, Number(row.price)]))
    return items.reduce((total, item) => total + (priceById.get(item.id) ?? 0) * item.qty, 0)
  }

  async reduceStockQuantities(items: { id: string; qty: number; subinventoryId?: string }[], clinicalEncounterId?: string): Promise<void> {
    await TenantContext.transaction(async () => {
      for (const item of [...items].sort((a, b) => a.id.localeCompare(b.id))) {
        requireQuantity(item.qty)
        await changeInventory({ productId: item.id, locationId: await inventoryLocationId(item.subinventoryId), quantity: -item.qty, type: 'consumption', clinicalEncounterId })
      }
    })
  }

  async restoreStockQuantities(items: { id: string; qty: number; subinventoryId?: string }[], clinicalEncounterId?: string): Promise<void> {
    await TenantContext.transaction(async () => {
      for (const item of [...items].sort((a, b) => a.id.localeCompare(b.id))) {
        requireQuantity(item.qty)
        if (clinicalEncounterId) await returnEncounterInventory(item.id, item.qty, clinicalEncounterId)
        else await changeInventory({ productId: item.id, locationId: await inventoryLocationId(item.subinventoryId), quantity: item.qty, type: 'return' })
      }
    })
  }

  async insertStockInvoice(invoiceId: string, items: { id: string; qty: number }[]): Promise<void> {
    await TenantContext.transaction(async () => {
      const db = TenantContext.getDb()
      for (const item of items) {
        requireQuantity(Math.abs(item.qty))
        if (item.qty < 0) {
          const rows = await db.select().from(invoiceItems).where(and(eq(invoiceItems.invoiceId, invoiceId),
            eq(invoiceItems.productId, item.id), isNull(invoiceItems.deletedAt))).orderBy(desc(invoiceItems.createdAt), invoiceItems.id).for('update')
          let remaining = -item.qty
          for (const row of rows) {
            if (!remaining) break
            const reduction = Math.min(remaining, row.quantity)
            const quantity = row.quantity - reduction
            if (!quantity) await db.update(invoiceItems).set({ deletedAt: new Date() }).where(eq(invoiceItems.id, row.id))
            else await db.update(invoiceItems).set({ quantity, totalAmount: (quantity * Number(row.unitPrice) - Number(row.discountAmount)).toFixed(2) }).where(eq(invoiceItems.id, row.id))
            remaining -= reduction
          }
          if (remaining) throw new Error('La corrección supera la cantidad facturada.')
        } else {
          const [product] = await db.select().from(products).where(and(eq(products.id, item.id), isNull(products.deletedAt)))
          if (!product) throw new Error(`Product not found: ${item.id}`)
          await db.insert(invoiceItems).values({ invoiceId, productId: item.id, category: 'insumo', description: product.name,
            quantity: item.qty, unitPrice: product.unitPrice, totalAmount: (Number(product.unitPrice) * item.qty).toFixed(2) })
        }
      }
    })
  }

  async insertStockHistory(historyId: string, items: { id: string; qty: number }[]): Promise<void> {
    await TenantContext.transaction(async () => {
      const db = TenantContext.getDb()
      for (const item of items) {
        requireQuantity(Math.abs(item.qty))
        const [existing] = await db.select().from(encounterProducts)
          .where(and(eq(encounterProducts.clinicalEncounterId, historyId), eq(encounterProducts.productId, item.id))).for('update')
        const quantity = (existing && !existing.deletedAt ? existing.quantity : 0) + item.qty
        if (quantity < 0) throw new Error('La corrección supera la cantidad usada.')
        if (existing) {
          await db.update(encounterProducts).set(quantity ? { quantity, deletedAt: null } : { deletedAt: new Date() })
            .where(eq(encounterProducts.id, existing.id))
        } else if (quantity) {
          await db.insert(encounterProducts).values({ clinicalEncounterId: historyId, productId: item.id, quantity })
        }
      }
    })
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

}
