import { BillingLedgerItem } from '../../domain/entities/Billing'

export const reportInvoiceNumber = (item: BillingLedgerItem) =>
  item.reference?.invoiceNumber ?? item.invoiceNumber

/** Invoice headers are totals, not additional charges on top of their detail. */
export const billingReportDetails = (
  invoices: BillingLedgerItem[],
  charges: BillingLedgerItem[],
): BillingLedgerItem[] => {
  const invoiceByNumber = new Map(invoices.map((invoice) => [reportInvoiceNumber(invoice), invoice]))
  const detailedCents = new Map<string, number>()
  const details: BillingLedgerItem[] = []
  for (const charge of charges) {
    if (charge.source === 'invoice' || charge.status === 'Anulado') continue
    const number = reportInvoiceNumber(charge)
    const invoice = number ? invoiceByNumber.get(number) : undefined
    if (invoice?.status === 'Anulado') continue
    details.push(invoice ? { ...charge, status: invoice.status } : charge)
    if (number) detailedCents.set(number, (detailedCents.get(number) ?? 0) + Math.round(charge.total * 100))
  }
  for (const invoice of invoices) {
    if (invoice.status === 'Anulado') continue
    const number = reportInvoiceNumber(invoice)!
    if (!detailedCents.has(number)) {
      details.push(invoice) // Legacy/standalone invoices without itemized charges.
      continue
    }
    const remainder = Math.round(invoice.total * 100) - detailedCents.get(number)!
    if (remainder !== 0) {
      // Preserve amounts when only part of an invoice is itemized. A signed
      // reconciliation line also makes an over-itemized invoice explicit.
      details.push({ ...invoice, id: `${invoice.id}-remainder`,
        description: `Diferencia con total de factura - ${number}`,
        unitPrice: remainder / 100, total: remainder / 100 })
    }
  }
  return details
}
