export const queries = (key: string) => {
  let query: string = ''
  switch( key ) {
    case 'get':
      query = `
        select 
          f.FacturaID, 
          concat(p.Nombre, ' ', p.Apellido) as Paciente, 
          concat(d.Nombre, ' ', d.Apellido) as Doctor, 
          f.FechaFactura, 
          f.Estado, 
          f.Monto,
          f.InvoiceNumber
        from facturas as f
        inner join doctores as d
          on d.DoctorID = f.DoctorID
        inner join pacientes as p
          on p.PacienteID = f.PacienteID
        where f.FacturaID > 4 and f.IsActive = true
        order by f.FechaFactura desc;
      `
      break
    case 'get-one':
      query = `
        select 
          f.FacturaID,
          f.PacienteID,
          f.DoctorID,
          f.FechaFactura,
          f.Monto,
          f.Estado,
          f.InvoiceNumber,
          f.TipoPagoID,
          sum(fi.Cantidad * i.PrecioUnidad) as Subtotal
        from facturas as f
          inner join factura_inventario as fi
            on fi.FacturaID = f.FacturaID
          inner join inventario as i
            on fi.ProductoID = i.ProductoID
        where f.InvoiceNumber = ?
        group by f.FacturaID, f.PacienteID, f.DoctorID, f.FechaFactura, f.Monto, f.Estado, f.InvoiceNumber, f.TipoPagoID;
      `
      break
    case 'get-stock-invoice':
      query = `
        select 
          fi.FacturaInventarioID, 
          fi.ProductoID
        from factura_inventario as fi 
        where fi.FacturaID = ?;
      `
      break
    case 'getServices':
      query = `
        select s.* from servicios as s;
      `
      break;
    case 'getPaymentMethods':
      query = `
        select tp.* from Tipo_Pago as tp;
      `
      break;
    case 'create-invoice':
      query = `
        insert into facturas(PacienteID, DoctorID, FechaFactura, Monto, Estado, InvoiceNumber, TipoPagoID)
        values(?, ?, ?, ?, ?, ?, ?);
      `
      break;
    case 'create-service-invoice':
      query = `
        insert into factura_servicios(FacturaID, ServicioID)
        values (?, ?);
      `
      break;
    case 'create-stock-invoice':
      query = `
        insert into factura_inventario(FacturaID, ProductoID, Cantidad)
        values (?, ?, ?);
      `
      break;
    case 'update-invoice':
      query = `
        update Facturas
        set
          FechaFactura = ?
          Monto = ?,
          Estado = ?,
          TipoPagoID = ?
        where FacturaID = ?;
      `
      break;
    case 'soft-delete':
      query = `
        update facturas as f
        set f.IsActive = ?
        where f.InvoiceNumber = ?;
      `
      break;
    default:
      query = ''
      break
  }

  return query;
}