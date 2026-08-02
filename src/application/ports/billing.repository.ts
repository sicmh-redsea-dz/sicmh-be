export interface BillingFilters {
  from: string
  to: string
  patientIds?: string[]
}

export interface BillingInvoiceRow {
  FacturaID: string
  InvoiceNumber: string
  FechaFactura: string
  Monto: number
  Estado: string
  TipoPagoID?: string | null
  PacienteID: string
  Paciente: string
  Doctor?: string | null
  TipoVisita?: string | null
}

export interface BillingInventoryRow {
  FacturaID: string
  InvoiceNumber: string
  FechaFactura: string
  Estado: string
  PacienteID: string
  Paciente: string
  ProductoID: string
  NombreProducto: string
  Cantidad: number
  PrecioUnidad: number
  total: number
  TipoVisita?: string | null
}

export interface BillingRepository {
  fetchInvoiceLedger(filters: BillingFilters): Promise<BillingInvoiceRow[]>
  fetchInventoryLedger(filters: BillingFilters): Promise<BillingInventoryRow[]>
}
