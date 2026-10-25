# Reportería: overlapping invoice and charge rows

Implemented locally on 2026-10-23. The backend previously concatenated complete invoice totals with their consultation/inventory/manual charges, displaying and aggregating the same amount twice.

## Change

- Invoice counts, total billed, paid, and pending amounts remain based on authoritative invoice headers, counted once per invoice number.
- Detail rows and category/station breakdowns use itemized charges, replacing a matching invoice header rather than adding it again.
- An invoice without itemized detail retains its full fallback row. If detail covers only part of an invoice, a signed `Diferencia con total de factura` row shows the remaining difference; existing amounts are not silently discarded.
- Linked charge status follows the invoice status. Annulled invoice details are excluded.
- Reconciliation happens before station/status filters, so filtering out detail does not reintroduce its complete invoice total as another charge.
- Independent charges with the same description/amount remain independent. No database records are deleted or rewritten.
- The report API contract is unchanged. The UI, CSV export, and PDF report consume the corrected report ledger.

## Evidence

Read-only execution of the corrected service against the configured tenant for 2026-10-23 returned:

| Metric | Result |
| --- | ---: |
| Invoices | 2 |
| Detail rows | 2 |
| First detail amount | L. 0.00 |
| Second detail amount | L. 1,000.00 |
| Invoice total / pending | L. 1,000.00 |
| Patient total | L. 1,000.00 |
| Category total | L. 1,000.00 |
| Station total | L. 1,000.00 |

`npm test` passed: 41 tests, zero failures, one optional MySQL schema/workflow integration suite skipped. The 12 new report tests cover the supplied two-invoice example, service/inventory detail, identical independent charges, legacy invoices without detail, partial/over-itemized invoices, rounding, paid/annulled state, filters, and duplicate headers from joins.

The backend TypeScript build passed as part of the tests. No frontend code, database data, migrations, or production deployment were changed. The database verification called the report service directly; browser display and deployed artifacts were not inspected.
