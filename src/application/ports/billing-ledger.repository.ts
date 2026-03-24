import { BillingLedgerStore } from '../../domain/entities/Billing'

export interface BillingLedgerRepository {
  load(): Promise<BillingLedgerStore>
  save(store: BillingLedgerStore): Promise<void>
}
