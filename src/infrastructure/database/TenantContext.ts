import { AsyncLocalStorage } from 'async_hooks'
import { Pool } from 'mysql2/promise'

const storage = new AsyncLocalStorage<Pool>()

export const TenantContext = {
  run<T>(pool: Pool, fn: () => T | Promise<T>): Promise<T> {
    return storage.run(pool, () => Promise.resolve(fn()))
  },
  getPool(): Pool {
    const pool = storage.getStore()
    if (!pool) throw new Error('No tenant context active. Ensure all requests go through auth middleware.')
    return pool
  },
}
