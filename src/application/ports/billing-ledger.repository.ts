import { BillingLedgerStore } from '../../domain/entities/Billing'

export interface BillingLedgerRepository {
  load(): Promise<BillingLedgerStore>
  save(store: BillingLedgerStore): Promise<void>
  /** Atomically loads, mutates, and saves the store so concurrent writers can't clobber each other. */
  update<T = void>(mutator: (store: BillingLedgerStore) => T | Promise<T>): Promise<T>
}
