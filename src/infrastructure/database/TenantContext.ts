import { AsyncLocalStorage } from 'async_hooks'
import { Pool, PoolConnection } from 'mysql2/promise'
import { TenantDatabase } from './drizzle'

interface TenantStore {
  pool: Pool
  db: TenantDatabase
  // Present only while Database.transaction() is running; every Database
  // call made during that window must reuse this connection instead of the
  // pool, or the statements wouldn't share a transaction.
  connection?: PoolConnection
}

const storage = new AsyncLocalStorage<TenantStore>()

export const TenantContext = {
  run<T>(pool: Pool, db: TenantDatabase, fn: () => T | Promise<T>): Promise<T> {
    return storage.run({ pool, db }, () => Promise.resolve(fn()))
  },
  runWithConnection<T>(connection: PoolConnection, fn: () => T | Promise<T>): Promise<T> {
    const current = storage.getStore()
    if (!current) throw new Error('No tenant context active. Ensure all requests go through auth middleware.')
    return storage.run({ pool: current.pool, db: current.db, connection }, () => Promise.resolve(fn()))
  },
  getPool(): Pool {
    const store = storage.getStore()
    if (!store) throw new Error('No tenant context active. Ensure all requests go through auth middleware.')
    return store.pool
  },
  getConnection(): PoolConnection | undefined {
    return storage.getStore()?.connection
  },
  getDb(): TenantDatabase {
    const store = storage.getStore()
    if (!store) throw new Error('No tenant context active. Ensure all requests go through auth middleware.')
    return store.db
  },
}
