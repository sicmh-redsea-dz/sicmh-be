export interface BillingFilters {
  from: string
  to: string
  patientIds?: number[]
}

export interface BillingInvoiceRow {
  FacturaID: number
  InvoiceNumber: string
  FechaFactura: string
  Monto: number
  Estado: string
  TipoPagoID?: number | null
  PacienteID: number
  Paciente: string
  Doctor?: string | null
  TipoVisita?: string | null
}

export interface BillingInventoryRow {
  FacturaID: number
  InvoiceNumber: string
  FechaFactura: string
  Estado: string
  PacienteID: number
  Paciente: string
  ProductoID: number
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
