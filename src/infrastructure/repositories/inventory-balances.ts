import { and, asc, eq, isNull, or, sql, gt } from 'drizzle-orm'
import { TenantContext } from '../database/TenantContext'
import { inventoryBatches, inventoryLocations, inventoryStock, products, stockMovements } from '../database/schema/tenant'

export const inventoryError = (message: string) => Object.assign(new Error(message), { name: 'validation_errors' })
export function requireQuantity(value: number, allowZero = false): number {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > 2147483647) {
    throw inventoryError('La cantidad debe ser un entero válido y no negativo; los movimientos deben ser mayores que cero.')
  }
  return value
}

export async function inventoryLocationId(value: string | number = 'main'): Promise<string> {
  const aliases: Record<string, string> = { '1': 'main', '2': 'outpatient', '3': 'emergency', '4': 'operating_room' }
  const key = aliases[String(value)] ?? String(value)
  const [location] = await TenantContext.getDb().select().from(inventoryLocations)
    .where(and(or(eq(inventoryLocations.id, key), eq(inventoryLocations.code, key)), isNull(inventoryLocations.deletedAt))).limit(1)
  if (!location) throw inventoryError('La ubicación de inventario no existe.')
  return location.id
}

// A product lock also serializes insertion of a balance that does not exist yet.
export async function changeInventory(input: {
  productId: string; locationId: string; quantity: number
  type: 'consumption' | 'return' | 'adjustment' | 'transfer'
  destinationId?: string
  clinicalEncounterId?: string
}): Promise<void> {
  requireQuantity(Math.abs(input.quantity))
  if (input.destinationId === input.locationId) throw inventoryError('Origen y destino deben ser distintos.')
  await TenantContext.transaction(async () => {
    const db = TenantContext.getDb()
    const [product] = await db.select({ id: products.id }).from(products)
      .where(and(eq(products.id, input.productId), isNull(products.deletedAt))).for('update')
    if (!product) throw inventoryError('El producto no existe.')
    const portions: Array<{ batchId: string | null; quantity: number }> = []
    if (input.quantity < 0) {
      const balances = await db.select({ balance: inventoryStock, expiresAt: inventoryBatches.expiresAt })
        .from(inventoryStock).leftJoin(inventoryBatches, eq(inventoryStock.batchId, inventoryBatches.id))
        .where(and(eq(inventoryStock.productId, input.productId), eq(inventoryStock.locationId, input.locationId),
          isNull(inventoryStock.deletedAt), isNull(inventoryBatches.deletedAt), gt(inventoryStock.quantity, 0)))
        .orderBy(sql`${inventoryBatches.expiresAt} IS NULL`, asc(inventoryBatches.expiresAt), asc(inventoryStock.id))
      let remaining = -input.quantity
      const today = new Date().toISOString().slice(0, 10)
      for (const { balance, expiresAt } of balances) {
        if (!remaining) break
        if (input.type === 'consumption' && expiresAt && expiresAt.toISOString().slice(0, 10) < today) continue
        const quantity = Math.min(remaining, balance.quantity)
        await db.update(inventoryStock).set({ quantity: balance.quantity - quantity }).where(eq(inventoryStock.id, balance.id))
        portions.push({ batchId: balance.batchId, quantity })
        remaining -= quantity
      }
      if (remaining) throw inventoryError(`Existencias insuficientes para el producto ${input.productId}.`)
    } else {
      portions.push({ batchId: null, quantity: input.quantity })
    }
    for (const portion of portions) {
      const destinationId = input.destinationId ?? (input.quantity > 0 ? input.locationId : undefined)
      if (destinationId) {
        await db.insert(inventoryStock).values({ productId: input.productId, locationId: destinationId, ...portion })
          .onDuplicateKeyUpdate({ set: { quantity: sql`${inventoryStock.quantity} + ${portion.quantity}`, deletedAt: null } })
      }
      await db.insert(stockMovements).values({
        productId: input.productId, batchId: portion.batchId, quantity: portion.quantity,
        fromLocationId: input.quantity < 0 ? input.locationId : null,
        toLocationId: destinationId, clinicalEncounterId: input.clinicalEncounterId, type: input.type, occurredAt: new Date(),
      })
    }
  })
}

/** Return supplies to the actual lots and locations used by this encounter. */
export async function returnEncounterInventory(productId: string, quantity: number, clinicalEncounterId: string): Promise<void> {
  requireQuantity(quantity)
  await TenantContext.transaction(async () => {
    const db = TenantContext.getDb()
    await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).for('update')
    const movements = await db.select().from(stockMovements)
      .where(and(eq(stockMovements.productId, productId), eq(stockMovements.clinicalEncounterId, clinicalEncounterId), isNull(stockMovements.deletedAt)))
      .orderBy(stockMovements.occurredAt, stockMovements.id)
    const outstanding = new Map<string, { locationId: string; batchId: string | null; quantity: number }>()
    for (const movement of movements) {
      const locationId = movement.type === 'consumption' ? movement.fromLocationId : movement.type === 'return' ? movement.toLocationId : null
      if (!locationId) continue
      const key = `${locationId}:${movement.batchId ?? ''}`
      const balance = outstanding.get(key) ?? { locationId, batchId: movement.batchId, quantity: 0 }
      balance.quantity += movement.type === 'consumption' ? movement.quantity : -movement.quantity
      outstanding.set(key, balance)
    }
    let remaining = quantity
    for (const balance of [...outstanding.values()].reverse()) {
      if (!remaining) break
      const restored = Math.min(remaining, balance.quantity)
      if (restored <= 0) continue
      await db.insert(inventoryStock).values({ productId, locationId: balance.locationId, batchId: balance.batchId, quantity: restored })
        .onDuplicateKeyUpdate({ set: { quantity: sql`${inventoryStock.quantity} + ${restored}`, deletedAt: null } })
      await db.insert(stockMovements).values({ productId, batchId: balance.batchId, toLocationId: balance.locationId,
        clinicalEncounterId, type: 'return', quantity: restored, occurredAt: new Date() })
      remaining -= restored
    }
    if (remaining) throw inventoryError('La devolución supera los insumos consumidos en esta atención.')
  })
}
