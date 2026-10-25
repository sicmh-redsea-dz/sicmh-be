import { TenantContext } from './TenantContext'

/** Compatibility entry point for existing service transaction boundaries. */
export class Database {
  static transaction<T>(fn: () => Promise<T>): Promise<T> {
    return TenantContext.transaction(fn)
  }
}
