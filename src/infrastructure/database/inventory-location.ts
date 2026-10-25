import { and, eq, isNull, or } from 'drizzle-orm'
import { TenantDatabase } from './drizzle'
import { TenantContext } from './TenantContext'
import { inventoryLocations } from './schema/tenant'

const legacyLocationCodes: Record<string, string> = {
  '1': 'main', '2': 'emergency', '3': 'operating_room', '4': 'hospitalization',
}

export const inventoryValidationError = (message: string) => Object.assign(new Error(message), {
  name: 'validation_errors', errors: [{ msg: message }],
})

export const normalizeLocationReference = (reference: string): string =>
  legacyLocationCodes[reference.trim()] ?? reference.trim()

/** Accept stable codes or tenant UUIDs, including legacy clients during rollout. */
export const resolveInventoryLocation = async (
  reference: string,
  db: Pick<TenantDatabase, 'select'> = TenantContext.getDb(),
): Promise<string> => {
  const value = normalizeLocationReference(reference)
  const [location] = await db.select({ id: inventoryLocations.id }).from(inventoryLocations)
    .where(and(
      or(eq(inventoryLocations.id, value), eq(inventoryLocations.code, value)),
      isNull(inventoryLocations.deletedAt),
    )).limit(1)
  if (!location) throw inventoryValidationError(`Inventory location is not configured: ${value}`)
  return location.id
}
