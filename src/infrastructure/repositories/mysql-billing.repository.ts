import { BillingRepository, BillingFilters, BillingInvoiceRow, BillingInventoryRow } from '../../application/ports/billing.repository'
import { Database } from '../database/Database'
import { billingQueries } from '../database/queries/billing.queries'

export class MysqlBillingRepository implements BillingRepository {
  async fetchInvoiceLedger(filters: BillingFilters): Promise<BillingInvoiceRow[]> {
    const { query, values } = billingQueries('invoice-ledger', filters)
    return Database.execute<BillingInvoiceRow[]>(query, values)
  }

  async fetchInventoryLedger(filters: BillingFilters): Promise<BillingInventoryRow[]> {
    const { query, values } = billingQueries('inventory-ledger', filters)
    return Database.execute<BillingInventoryRow[]>(query, values)
  }
}
