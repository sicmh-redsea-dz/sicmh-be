import { randomUUID } from 'crypto'
import { and, eq, isNull, like, or, sql, sum } from 'drizzle-orm'
import { InventoryRepository } from '../../application/ports/inv.repository'
import { TenantContext } from '../database/TenantContext'
import { inventoryStock, products } from '../database/schema/tenant'
import { changeInventory, inventoryError, inventoryLocationId, requireQuantity } from './inventory-balances'

export class MysqlInvRepository implements InventoryRepository {
  async findAll(pagination: { limit: number; offset: number; term: string }, subinvId: string | number): Promise<any[]> {
    const locationId = await inventoryLocationId(subinvId)
    const rows = await TenantContext.getDb().select({ product: products, quantity: sum(inventoryStock.quantity), total: sql<number>`COUNT(*) OVER()` })
      .from(products).leftJoin(inventoryStock, and(eq(products.id, inventoryStock.productId), eq(inventoryStock.locationId, locationId), isNull(inventoryStock.deletedAt)))
      .where(and(isNull(products.deletedAt), pagination.term ? or(like(products.name, `%${pagination.term}%`), like(products.description, `%${pagination.term}%`)) : undefined))
      .groupBy(products.id).orderBy(products.name, products.id)
      .limit(Math.max(1, Math.min(200, Math.trunc(pagination.limit) || 25))).offset(Math.max(0, Math.trunc(pagination.offset) || 0))
    return rows.map(({ product, quantity, total }) => ({ ...this.legacy(product, Number(quantity ?? 0)), total_registries: Number(total) }))
  }

  async findById(id: string): Promise<any | null> {
    const [row] = await TenantContext.getDb().select({ product: products, quantity: sum(inventoryStock.quantity) })
      .from(products).leftJoin(inventoryStock, and(eq(products.id, inventoryStock.productId), isNull(inventoryStock.deletedAt)))
      .where(and(eq(products.id, id), isNull(products.deletedAt))).groupBy(products.id)
    return row ? this.legacy(row.product, Number(row.quantity ?? 0)) : null
  }

  async transfer(data: { prodId: string; prodQty: number; fromLocId: string | number; toLocId: string | number }): Promise<any> {
    requireQuantity(data.prodQty)
    const from = await inventoryLocationId(data.fromLocId)
    const to = await inventoryLocationId(data.toLocId)
    await changeInventory({ productId: data.prodId, locationId: from, destinationId: to, quantity: -data.prodQty, type: 'transfer' })
    return { transferred: data.prodQty, productId: data.prodId, fromLocationId: from, toLocationId: to }
  }

  async create(data: Record<string, any>): Promise<string> {
    const name = String(data.NombreProducto ?? '').trim()
    if (!name) throw inventoryError('El nombre del producto es obligatorio.')
    const quantity = requireQuantity(Number(data.Cantidad ?? 0), true)
    const minimumStock = requireQuantity(Number(data.NivelMinimoStock ?? 0), true)
    const unitPrice = this.price(data.PrecioUnidad)
    return TenantContext.transaction(async () => {
      const id = randomUUID()
      await TenantContext.getDb().insert(products).values({ id, name, description: data.Descripcion ?? null, unitPrice, minimumStock })
      if (quantity) await changeInventory({ productId: id, locationId: await inventoryLocationId(), quantity, type: 'adjustment' })
      return id
    })
  }

  async update(id: string, data: Record<string, any>): Promise<number> {
    return TenantContext.transaction(async () => {
      const db = TenantContext.getDb()
      const [product] = await db.select().from(products).where(and(eq(products.id, id), isNull(products.deletedAt))).for('update')
      if (!product) return 0
      const name = data.prodName === undefined ? product.name : String(data.prodName).trim()
      if (!name) throw inventoryError('El nombre del producto es obligatorio.')
      await db.update(products).set({ name, description: data.prodDesc ?? product.description,
        minimumStock: data.prodMinStock === undefined ? product.minimumStock : requireQuantity(Number(data.prodMinStock), true),
        unitPrice: data.prodUnitPrice === undefined ? product.unitPrice : this.price(data.prodUnitPrice),
      }).where(eq(products.id, id))
      if (data.prodQty !== undefined) {
        const quantity = requireQuantity(Number(data.prodQty), true)
        // The legacy edit endpoint adjusts the general warehouse, never other locations.
        const locationId = await inventoryLocationId(data.subinvId ?? 'main')
        const [balance] = await db.select({ quantity: sum(inventoryStock.quantity) }).from(inventoryStock)
          .where(and(eq(inventoryStock.productId, id), eq(inventoryStock.locationId, locationId), isNull(inventoryStock.deletedAt)))
        const difference = quantity - Number(balance?.quantity ?? 0)
        if (difference) await changeInventory({ productId: id, locationId, quantity: difference, type: 'adjustment' })
      }
      return 1
    })
  }

  private price(value: unknown): string {
    const amount = Number(value ?? 0)
    if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) throw inventoryError('El precio no es válido.')
    return amount.toFixed(2)
  }
  private legacy(product: typeof products.$inferSelect, quantity: number) {
    return { ProductoID: product.id, NombreProducto: product.name, Descripcion: product.description ?? '',
      PrecioUnidad: product.unitPrice, NivelMinimoStock: product.minimumStock, Cantidad: quantity }
  }
}
