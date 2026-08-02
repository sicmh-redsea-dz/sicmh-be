import { and, desc, eq, isNull } from 'drizzle-orm'
import { BillingLedgerRepository } from '../../application/ports/billing-ledger.repository'
import { BillingItemCategory, BillingLedgerStore } from '../../domain/entities/Billing'
import { TenantContext } from '../database/TenantContext'
import { billingLedgerEntries, invoices, patients } from '../database/schema'

export class DrizzleBillingLedgerRepository implements BillingLedgerRepository {
  async load(): Promise<BillingLedgerStore> {
    const rows = await TenantContext.getDb()
      .select({
        entry: billingLedgerEntries,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        invoiceNumber: invoices.invoiceNumber,
      })
      .from(billingLedgerEntries)
      .innerJoin(patients, eq(billingLedgerEntries.patientId, patients.id))
      .leftJoin(invoices, eq(billingLedgerEntries.invoiceId, invoices.id))
      .where(and(isNull(billingLedgerEntries.deletedAt), isNull(patients.deletedAt)))
      .orderBy(desc(billingLedgerEntries.occurredAt))

    return {
      items: rows.map(({ entry, patientFirstName, patientLastName, invoiceNumber }) => ({
        id: entry.id,
        patientId: entry.patientId,
        patientName: `${patientFirstName} ${patientLastName}`.trim(),
        encounterId: entry.careEpisodeId ?? undefined,
        invoiceNumber: invoiceNumber ?? undefined,
        station: entry.station ?? undefined,
        category: entry.category as BillingItemCategory,
        description: entry.description,
        quantity: entry.quantity,
        unitPrice: Number(entry.unitPrice),
        total: Number(entry.totalAmount),
        occurredAt: entry.occurredAt.toISOString(),
        status: entry.status,
        source: entry.source,
        reference: {
          invoiceNumber: invoiceNumber ?? undefined,
          movementId: entry.movementId ?? undefined,
          productId: entry.productId ?? undefined,
        },
      })),
      updatedAt: new Date().toISOString(),
    }
  }

  async save(store: BillingLedgerStore): Promise<void> {
    const db = TenantContext.getDb()
    await db.transaction(async (tx) => {
      await tx.update(billingLedgerEntries)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(isNull(billingLedgerEntries.deletedAt))

      for (const item of store.items) {
        const invoice = item.invoiceNumber
          ? (await tx.select({ id: invoices.id }).from(invoices)
            .where(and(eq(invoices.invoiceNumber, item.invoiceNumber), isNull(invoices.deletedAt))).limit(1))[0]
          : undefined
        const values = {
          id: item.id,
          patientId: item.patientId,
          careEpisodeId: item.encounterId ?? null,
          invoiceId: invoice?.id ?? null,
          productId: item.reference?.productId ?? null,
          movementId: item.reference?.movementId ?? null,
          station: item.station ?? null,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          totalAmount: String(item.total),
          occurredAt: new Date(item.occurredAt),
          status: item.status,
          source: item.source,
          deletedAt: null,
          updatedAt: new Date(),
        }
        await tx.insert(billingLedgerEntries).values(values).onDuplicateKeyUpdate({ set: values })
      }
    })
  }

  async update<T>(mutator: (store: BillingLedgerStore) => T | Promise<T>): Promise<T> {
    const store = await this.load()
    const result = await mutator(store)
    await this.save(store)
    return result
  }
}
