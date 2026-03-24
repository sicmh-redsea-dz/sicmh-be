import { BillingFilters } from '../../../application/ports/billing.repository'

const buildPatientClause = (filters: BillingFilters) => {
  const patientIds = filters.patientIds ?? []
  if (patientIds.length === 0) {
    return { clause: '', values: [] as number[] }
  }

  const placeholders = patientIds.map(() => '?').join(', ')
  return {
    clause: `AND f.PacienteID IN (${placeholders})`,
    values: patientIds
  }
}

export const billingQueries = (
  key: 'invoice-ledger' | 'inventory-ledger',
  filters: BillingFilters
): { query: string; values: any[] } => {
  const { from, to } = filters
  const patientClause = buildPatientClause(filters)

  switch (key) {
    case 'invoice-ledger': {
      const query = `
        SELECT
          f.FacturaID,
          f.InvoiceNumber,
          f.FechaFactura,
          f.Monto,
          f.Estado,
          f.TipoPagoID,
          p.PacienteID,
          CONCAT(p.Nombre, ' ', p.Apellido) AS Paciente,
          CONCAT(d.Nombre, ' ', d.Apellido) AS Doctor,
          hm.TipoVisita
        FROM facturas AS f
        INNER JOIN pacientes AS p ON p.PacienteID = f.PacienteID
        LEFT JOIN personal AS d ON d.PersonalID = f.PersonalID
        LEFT JOIN historia_medica AS hm ON hm.FacturaID = f.FacturaID
        WHERE
          f.IsActive = 1
          AND DATE(f.FechaFactura) BETWEEN ? AND ?
          ${patientClause.clause}
        ORDER BY f.FechaFactura DESC;
      `

      return { query, values: [from, to, ...patientClause.values] }
    }
    case 'inventory-ledger': {
      const query = `
        SELECT
          fi.FacturaID,
          f.InvoiceNumber,
          f.FechaFactura,
          f.Estado,
          p.PacienteID,
          CONCAT(p.Nombre, ' ', p.Apellido) AS Paciente,
          inv.ProductoID,
          inv.NombreProducto,
          fi.Cantidad,
          inv.PrecioUnidad,
          (fi.Cantidad * inv.PrecioUnidad) AS total,
          hm.TipoVisita
        FROM Factura_Inventario AS fi
        INNER JOIN facturas AS f ON f.FacturaID = fi.FacturaID
        INNER JOIN pacientes AS p ON p.PacienteID = f.PacienteID
        INNER JOIN Inventario AS inv ON inv.ProductoID = fi.ProductoID
        LEFT JOIN historia_medica AS hm ON hm.FacturaID = f.FacturaID
        WHERE
          f.IsActive = 1
          AND DATE(f.FechaFactura) BETWEEN ? AND ?
          ${patientClause.clause}
        ORDER BY f.FechaFactura DESC;
      `

      return { query, values: [from, to, ...patientClause.values] }
    }
    default:
      return { query: '', values: [] }
  }
}
