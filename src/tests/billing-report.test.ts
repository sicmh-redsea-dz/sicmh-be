import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BillingService } from '../application/services/billing.service'
import { BillingInvoiceRow, BillingInventoryRow, BillingFilters } from '../application/ports/billing.repository'
import { BillingLedgerItem } from '../domain/entities/Billing'

const date = '2026-10-23'
const invoice = (number: string, total: number, status = 'Pendiente'): BillingInvoiceRow => ({
  FacturaID: number, InvoiceNumber: number, FechaFactura: `${date}T00:00:00.000Z`,
  Monto: total, Estado: status, PacienteID: 'patient', Paciente: 'Test Patient', TipoVisita: 'Consulta',
})
const charge = (number: string, total: number, extra: Partial<BillingLedgerItem> = {}): BillingLedgerItem => ({
  id: `charge-${number}`, patientId: 'patient', patientName: 'Test Patient', category: 'servicio',
  description: 'Consulta', quantity: 1, unitPrice: total, total, occurredAt: `${date}T00:00:00.000Z`,
  status: 'Pendiente', source: 'manual', station: 'consulta', reference: { invoiceNumber: number }, ...extra,
})
const stockItem = (number: string, total: number): BillingInventoryRow => ({
  FacturaID: number, InvoiceNumber: number, FechaFactura: date, Estado: 'Pendiente',
  PacienteID: 'patient', Paciente: 'Test Patient', ProductoID: 'product', NombreProducto: 'Stock',
  Cantidad: 1, PrecioUnidad: total, total, TipoVisita: 'Consulta',
})
const service = (invoices: BillingInvoiceRow[], items: BillingLedgerItem[] = [], stock: BillingInventoryRow[] = []) => {
  const within = (row: BillingInvoiceRow | BillingInventoryRow, filters: BillingFilters) =>
    row.FechaFactura.slice(0, 10) >= filters.from && row.FechaFactura.slice(0, 10) <= filters.to
    && (!filters.patientIds?.length || filters.patientIds.includes(row.PacienteID))
  return new BillingService({} as any, {} as any, {
    fetchInvoiceLedger: async (filters) => invoices.filter((row) => within(row, filters)),
    fetchInventoryLedger: async (filters) => stock.filter((row) => within(row, filters)),
  }, { load: async () => ({ items, updatedAt: date }) } as any,
  { load: async () => ({ events: [], updatedAt: date }) } as any, {} as any, {} as any)
}
const filters = { from: date, to: date }
const sum = (items: { total: number }[]) => items.reduce((value, item) => value + item.total, 0)

test('two invoices with their consultation charges produce two detail rows and unchanged invoice totals', async () => {
  const report = await service([invoice('zero', 0), invoice('one', 1000)],
    [charge('zero', 0), charge('one', 1000)]).getReport(filters)
  assert.equal(report.ledger.length, 2)
  assert.ok(report.ledger.every((item) => item.source === 'manual'))
  assert.equal(report.summary.counts.invoices, 2)
  assert.equal(report.summary.counts.ledgerItems, 2)
  assert.equal(report.summary.totals.invoiceTotal, 1000)
  assert.equal(report.summary.totals.invoicePending, 1000)
  assert.equal(report.summary.byPatient[0].total, 1000)
  assert.equal(report.summary.byDay[0].total, 1000)
  assert.equal(sum(report.summary.byCategory), 1000)
  assert.equal(sum(report.summary.byStation), 1000)
})

test('service and inventory details are retained without also adding their invoice total', async () => {
  const report = await service([invoice('one', 1250)], [charge('one', 1000)], [stockItem('one', 250)]).getReport(filters)
  assert.equal(report.ledger.length, 2)
  assert.equal(sum(report.ledger), 1250)
  assert.equal(report.summary.totals.inventoryTotal, 250)
  assert.equal(report.summary.totals.manualTotal, 1000)
  assert.equal(report.summary.totals.invoiceTotal, 1250)
  assert.equal(report.summary.byPatient[0].inventoryTotal, 250)
  assert.equal(report.summary.byPatient[0].manualTotal, 1000)
  assert.equal(report.summary.byPatient[0].invoiceTotal, 1250)
  assert.equal(report.summary.byPatient[0].total, 1250)
})

test('separate charges with identical descriptions and amounts are not collapsed', async () => {
  const report = await service([invoice('one', 1000)], [
    charge('one', 500, { id: 'a' }), charge('one', 500, { id: 'b' }),
  ]).getReport(filters)
  assert.deepEqual(report.ledger.map((item) => item.id).sort(), ['a', 'b'])
  assert.equal(sum(report.ledger), 1000)
})

test('invoices without itemized detail remain visible as fallback rows', async () => {
  const report = await service([invoice('one', 300)]).getReport(filters)
  assert.equal(report.ledger.length, 1)
  assert.equal(report.ledger[0].source, 'invoice')
  assert.equal(report.summary.counts.invoices, 1)
  assert.equal(report.summary.byDay[0].total, 300)
  assert.equal(sum(report.summary.byStation), 300)
})

test('partially itemized invoices show only the remaining amount alongside existing charges', async () => {
  const report = await service([invoice('one', 1250)], [], [stockItem('one', 250)]).getReport(filters)
  const remainder = report.ledger.find((item) => item.source === 'invoice')!
  assert.equal(report.ledger.length, 2)
  assert.equal(remainder.total, 1000)
  assert.match(remainder.description, /Diferencia con total/)
  assert.equal(sum(report.ledger), 1250)
  assert.equal(report.summary.totals.invoiceTotal, 1250)
})

test('over-itemized invoices expose a signed difference instead of overstating the breakdown', async () => {
  const report = await service([invoice('one', 900)], [charge('one', 1000)]).getReport(filters)
  assert.equal(report.ledger.find((item) => item.source === 'invoice')?.total, -100)
  assert.equal(sum(report.summary.byCategory), 900)
  assert.equal(sum(report.summary.byStation), 900)
})

test('cent rounding does not manufacture extra rows', async () => {
  const report = await service([invoice('one', 0.3)], [
    charge('one', 0.1, { id: 'a' }), charge('one', 0.2, { id: 'b' }),
  ]).getReport(filters)
  assert.equal(report.ledger.length, 2)
  assert.ok(report.ledger.every((item) => item.source !== 'invoice'))
})

test('paid status comes from the linked invoice even if its detail still says pending', async () => {
  const svc = service([invoice('one', 1000, 'Pagado')], [charge('one', 1000)])
  const paid = await svc.getReport({ ...filters, status: 'Pagado' })
  assert.equal(paid.ledger.length, 1)
  assert.equal(paid.ledger[0].status, 'Pagado')
  assert.equal(paid.summary.totals.invoicePaid, 1000)
  assert.equal(paid.summary.counts.invoices, 1)
  const pending = await svc.getReport({ ...filters, status: 'Pendiente' })
  assert.equal(pending.ledger.length, 0)
  assert.equal(pending.summary.counts.invoices, 0)
})

test('annulled invoices also exclude still-pending linked charges', async () => {
  const report = await service([invoice('one', 1000, 'Anulado')], [charge('one', 1000)]).getReport(filters)
  assert.equal(report.ledger.length, 0)
  assert.equal(report.summary.totals.invoiceTotal, 0)
  assert.equal(report.summary.counts.invoices, 0)
})

test('station filters do not recreate invoice totals for hidden itemized charges', async () => {
  const report = await service([invoice('one', 1000)],
    [charge('one', 1000, { station: 'laboratorio' })]).getReport({ ...filters, station: 'consulta' })
  assert.equal(report.ledger.length, 0)
  assert.equal(report.summary.totals.invoiceTotal, 1000)
  assert.equal(report.summary.counts.invoices, 1)
})

test('patient/date filters preserve scope and do not remove unrelated standalone charges', async () => {
  const svc = service([invoice('one', 1000)], [
    charge('one', 1000),
    charge('none', 50, { id: 'other-patient', patientId: 'other', reference: undefined }),
    charge('none', 60, { id: 'outside-date', occurredAt: '2026-10-22', reference: undefined }),
  ])
  const all = await svc.getReport(filters)
  assert.equal(all.ledger.length, 2)
  assert.equal(sum(all.ledger), 1050)
  const scoped = await svc.getReport({ ...filters, patientIds: ['patient'] })
  assert.equal(scoped.ledger.length, 1)
  assert.equal(sum(scoped.ledger), 1000)
})

test('a joined duplicate invoice header is counted once, without collapsing charge details', async () => {
  const row = invoice('one', 1000)
  const report = await service([row, { ...row }], [charge('one', 1000)]).getReport(filters)
  assert.equal(report.ledger.length, 1)
  assert.equal(report.summary.counts.invoices, 1)
  assert.equal(report.summary.totals.invoiceTotal, 1000)
})
