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
        from Facturas as f
        inner join Doctores as d
          on d.DoctorID = f.DoctorID
        inner join Pacientes as p
          on p.PacienteID = f.PacienteID
        where f.FacturaID > 4 and f.IsActive = true
        order by f.FechaFactura desc;;
      `
      break
    case 'getServices':
      query = `
        select s.* from Servicios as s;
      `
      break;
    case 'getPaymentMethods':
      query = `
        select tp.* from Tipo_Pago as tp;
      `
      break;
    case 'create-invoice':
      query = `
        insert into Facturas(PacienteID, DoctorID, FechaFactura, Monto, Estado, InvoiceNumber, TipoPagoID)
        values(?, ?, ?, ?, ?, ?, ?);
      `
      break;
    case 'create-detail-invoice':
      query = `
        insert into FacturaServicios(FacturaID, ServicioID)
        values (?, ?);
      `
      break;
    case 'soft-delete':
      query = `
        update Facturas as f
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