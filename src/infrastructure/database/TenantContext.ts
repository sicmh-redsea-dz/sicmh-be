import { AsyncLocalStorage } from 'async_hooks'
import { Pool } from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import { TenantDatabase } from './drizzle'
import { aggregateLocks } from './schema/tenant'

type TenantTransaction = Parameters<Parameters<TenantDatabase['transaction']>[0]>[0]
export type TenantExecutor = TenantDatabase | TenantTransaction
interface TenantStore {
  pool: Pool
  db: TenantExecutor
  inTransaction?: boolean
  locks: Set<string>
}
const storage = new AsyncLocalStorage<TenantStore>()
const currentStore = (): TenantStore => {
  const store = storage.getStore()
  if (!store) throw new Error('No tenant context active. Ensure all requests go through auth middleware.')
  return store
}

export const TenantContext = {
  run<T>(pool: Pool, db: TenantExecutor, fn: () => T | Promise<T>): Promise<T> {
    return storage.run({ pool, db, locks: new Set() }, () => Promise.resolve(fn()))
  },
  getPool(): Pool { return currentStore().pool },
  getDb(): TenantExecutor { return currentStore().db },
  // Repositories reached through services share this transaction, including Drizzle queries.
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const store = currentStore()
    if (store.inTransaction) return fn()
    return store.db.transaction(tx => storage.run(
      { ...store, db: tx, inTransaction: true, locks: new Set() }, fn,
    ), { isolationLevel: 'read committed' })
  },
  // The store-shaped adapters need serialization before load, not only during save.
  async withLock<T>(scope: string, fn: () => Promise<T>): Promise<T> {
    return TenantContext.transaction(async () => {
      const store = currentStore()
      if (store.locks.has(scope)) return fn()
      await store.db.insert(aggregateLocks).values({ scope }).onDuplicateKeyUpdate({ set: { scope } })
      await store.db.select({ id: aggregateLocks.id }).from(aggregateLocks)
        .where(eq(aggregateLocks.scope, scope)).for('update')
      store.locks.add(scope)
      return fn()
    })
  },
}
