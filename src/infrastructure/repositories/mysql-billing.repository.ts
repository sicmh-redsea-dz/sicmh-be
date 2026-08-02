import { and, desc, eq, gte, inArray, isNull, lt } from 'drizzle-orm'
import {
  BillingFilters,
  BillingInventoryRow,
  BillingInvoiceRow,
  BillingRepository,
} from '../../application/ports/billing.repository'
import { TenantContext } from '../database/TenantContext'
import {
  clinicalEncounters,
  invoiceItems,
  invoices,
  patients,
  products,
  staffMembers,
} from '../database/schema'

const endExclusive = (date: string) => {
  const end = new Date(date)
  end.setDate(end.getDate() + 1)
  return end
}

const visitType = (type: typeof clinicalEncounters.$inferSelect.type | null) => type
  ? ({
      outpatient: 'Consulta',
      emergency: 'Emergencia',
      hospitalization: 'Hospitalizacion',
      operating_room: 'Quirofano',
    }[type])
  : null

export class MysqlBillingRepository implements BillingRepository {
  async fetchInvoiceLedger(filters: BillingFilters): Promise<BillingInvoiceRow[]> {
    const patientFilter = filters.patientIds?.length
      ? inArray(invoices.patientId, filters.patientIds)
      : undefined
    const rows = await TenantContext.getDb()
      .select({
        invoice: invoices,
        patient: patients,
        staff: staffMembers,
        encounterType: clinicalEncounters.type,
      })
      .from(invoices)
      .innerJoin(patients, eq(invoices.patientId, patients.id))
      .leftJoin(staffMembers, eq(invoices.staffMemberId, staffMembers.id))
      .leftJoin(clinicalEncounters, and(
        eq(clinicalEncounters.invoiceId, invoices.id),
        isNull(clinicalEncounters.deletedAt),
      ))
      .where(and(
        isNull(invoices.deletedAt),
        isNull(patients.deletedAt),
        gte(invoices.issuedAt, new Date(filters.from)),
        lt(invoices.issuedAt, endExclusive(filters.to)),
        patientFilter,
      ))
      .orderBy(desc(invoices.issuedAt))

    return rows.map(({ invoice, patient, staff, encounterType }) => ({
      FacturaID: invoice.id,
      InvoiceNumber: invoice.invoiceNumber,
      FechaFactura: invoice.issuedAt.toISOString(),
      Monto: Number(invoice.amount),
      Estado: invoice.status,
      TipoPagoID: invoice.paymentMethodId,
      PacienteID: patient.id,
      Paciente: `${patient.firstName} ${patient.lastName}`.trim(),
      Doctor: staff ? `${staff.firstName} ${staff.lastName}`.trim() : null,
      TipoVisita: visitType(encounterType),
    }))
  }

  async fetchInventoryLedger(filters: BillingFilters): Promise<BillingInventoryRow[]> {
    const patientFilter = filters.patientIds?.length
      ? inArray(invoices.patientId, filters.patientIds)
      : undefined
    const rows = await TenantContext.getDb()
      .select({
        invoice: invoices,
        patient: patients,
        item: invoiceItems,
        product: products,
        encounterType: clinicalEncounters.type,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .innerJoin(patients, eq(invoices.patientId, patients.id))
      .innerJoin(products, eq(invoiceItems.productId, products.id))
      .leftJoin(clinicalEncounters, and(
        eq(clinicalEncounters.invoiceId, invoices.id),
        isNull(clinicalEncounters.deletedAt),
      ))
      .where(and(
        isNull(invoiceItems.deletedAt),
        isNull(invoices.deletedAt),
        isNull(patients.deletedAt),
        isNull(products.deletedAt),
        gte(invoices.issuedAt, new Date(filters.from)),
        lt(invoices.issuedAt, endExclusive(filters.to)),
        patientFilter,
      ))
      .orderBy(desc(invoices.issuedAt))

    return rows.map(({ invoice, patient, item, product, encounterType }) => ({
      FacturaID: invoice.id,
      InvoiceNumber: invoice.invoiceNumber,
      FechaFactura: invoice.issuedAt.toISOString(),
      Estado: invoice.status,
      PacienteID: patient.id,
      Paciente: `${patient.firstName} ${patient.lastName}`.trim(),
      ProductoID: product.id,
      NombreProducto: product.name,
      Cantidad: item.quantity,
      PrecioUnidad: Number(item.unitPrice),
      total: Number(item.totalAmount),
      TipoVisita: visitType(encounterType),
    }))
  }
}
