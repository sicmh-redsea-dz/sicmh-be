import { and, count, eq, gte, isNull, like, sql } from 'drizzle-orm'
import { InventoryRepository } from '../../application/ports/inv.repository'
import { inventoryValidationError, resolveInventoryLocation } from '../database/inventory-location'
import { TenantContext } from '../database/TenantContext'
import { inventoryStock, products, stockMovements } from '../database/schema/tenant'

const toLegacyProduct = (product: typeof products.$inferSelect, quantity: number, total = 0) => ({
  ProductoID: product.id, NombreProducto: product.name, Descripcion: product.description ?? '',
  PrecioUnidad: product.unitPrice, NivelMinimoStock: product.minimumStock,
  Cantidad: quantity, total_registries: total,
})

const validateProduct = (name: unknown, price: unknown, quantity: unknown, minimum: unknown) => {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 150) {
    throw inventoryValidationError('Product name is required and must not exceed 150 characters.')
  }
  if (!Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 9999999999.99) {
    throw inventoryValidationError('Product price must be a non-negative amount.')
  }
  for (const value of [quantity, minimum]) {
    if (!Number.isSafeInteger(Number(value)) || Number(value) < 0 || Number(value) > 2147483647) {
      throw inventoryValidationError('Stock quantities must be non-negative integers.')
    }
  }
}

export class MysqlInvRepository implements InventoryRepository {
  async findAll(pagination: { limit: number; offset: number; term: string }, reference: string): Promise<any[]> {
    const db = TenantContext.getDb()
    const locationId = await resolveInventoryLocation(reference, db)
    const filter = and(isNull(products.deletedAt), isNull(inventoryStock.deletedAt),
      eq(inventoryStock.locationId, locationId),
      pagination.term ? like(products.name, `%${pagination.term}%`) : undefined)
    const [rows, totals] = await Promise.all([
      db.select({ product: products, quantity: inventoryStock.quantity }).from(products)
        .innerJoin(inventoryStock, eq(products.id, inventoryStock.productId)).where(filter)
        .orderBy(products.name, products.id).limit(pagination.limit).offset(pagination.offset),
      db.select({ total: count() }).from(products)
        .innerJoin(inventoryStock, eq(products.id, inventoryStock.productId)).where(filter),
    ])
    return rows.map(({ product, quantity }) => toLegacyProduct(product, quantity, totals[0]?.total ?? 0))
  }

  async findById(id: string): Promise<any | null> {
    const db = TenantContext.getDb()
    const mainId = await resolveInventoryLocation('main', db)
    const [row] = await db.select({ product: products, quantity: inventoryStock.quantity }).from(products)
      .leftJoin(inventoryStock, and(eq(products.id, inventoryStock.productId),
        eq(inventoryStock.locationId, mainId), isNull(inventoryStock.deletedAt)))
      .where(and(eq(products.id, id), isNull(products.deletedAt))).limit(1)
    return row ? toLegacyProduct(row.product, row.quantity ?? 0) : null
  }

  async transfer(data: { prodId: string; prodQty: number; fromLocId: string; toLocId: string; actorId?: string }): Promise<any> {
    if (!Number.isSafeInteger(data.prodQty) || data.prodQty <= 0 || data.prodQty > 2147483647) {
      throw inventoryValidationError('Transfer quantity must be a positive integer.')
    }
    return TenantContext.getDb().transaction(async (db) => {
      const from = await resolveInventoryLocation(data.fromLocId, db)
      const to = await resolveInventoryLocation(data.toLocId, db)
      if (from === to) throw inventoryValidationError('Origin and destination must be different.')
      // Serialize transfers and manual edits for a product; conditional updates
      // also protect against concurrent visit consumption.
      const [product] = await db.select({ id: products.id }).from(products)
        .where(and(eq(products.id, data.prodId), isNull(products.deletedAt))).for('update')
      if (!product) throw inventoryValidationError('Product not found.')
      const result = await db.update(inventoryStock)
        .set({ quantity: sql`${inventoryStock.quantity} - ${data.prodQty}` })
        .where(and(eq(inventoryStock.productId, data.prodId), eq(inventoryStock.locationId, from),
          isNull(inventoryStock.deletedAt), gte(inventoryStock.quantity, data.prodQty)))
      if (result[0].affectedRows !== 1) throw inventoryValidationError('Insufficient stock at origin.')
      await db.insert(inventoryStock).values({ productId: data.prodId, locationId: to, quantity: data.prodQty })
        .onDuplicateKeyUpdate({ set: {
          quantity: sql`case when ${inventoryStock.deletedAt} is null then ${inventoryStock.quantity} else 0 end + ${data.prodQty}`,
          deletedAt: null,
        } })
      const [movement] = await db.insert(stockMovements).values({
        productId: data.prodId, fromLocationId: from, toLocationId: to, type: 'transfer',
        quantity: data.prodQty, occurredAt: new Date(), actorId: data.actorId,
      }).$returningId()
      return { id: movement.id }
    })
  }

  async create(data: Record<string, any>): Promise<string> {
    const { NombreProducto: name, PrecioUnidad: price, Cantidad: quantity, NivelMinimoStock: minimum } = data
    validateProduct(name, price, quantity, minimum)
    return TenantContext.getDb().transaction(async (db) => {
      const mainId = await resolveInventoryLocation('main', db)
      const [product] = await db.insert(products).values({
        name: name.trim(), description: data.Descripcion || null,
        unitPrice: Number(price).toFixed(2), minimumStock: Number(minimum),
      }).$returningId()
      await db.insert(inventoryStock).values({ productId: product.id, locationId: mainId, quantity: Number(quantity) })
      return product.id
    })
  }

  async update(id: string, data: Record<string, any>): Promise<number> {
    const { prodName: name, prodUnitPrice: price, prodQty: quantity, prodMinStock: minimum } = data
    validateProduct(name, price, quantity, minimum)
    return TenantContext.getDb().transaction(async (db) => {
      const mainId = await resolveInventoryLocation('main', db)
      const [product] = await db.select({ id: products.id }).from(products)
        .where(and(eq(products.id, id), isNull(products.deletedAt))).for('update')
      if (!product) return 0
      await db.update(products).set({ name: name.trim(), description: data.prodDesc || null,
        unitPrice: Number(price).toFixed(2), minimumStock: Number(minimum) }).where(eq(products.id, id))
      await db.insert(inventoryStock).values({ productId: id, locationId: mainId, quantity: Number(quantity) })
        .onDuplicateKeyUpdate({ set: { quantity: Number(quantity), deletedAt: null } })
      return 1
    })
  }
}
