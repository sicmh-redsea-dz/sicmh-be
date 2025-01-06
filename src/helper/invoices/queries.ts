export const queries = (key: string) => {
  let query: string = ''
  switch( key ) {
    // cambiar query -> Facturas, Servicios, FacturaServicios
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
        where f.FacturaID > 4;
      `
      break
    default:
      query = ''
      break
  }

  return query;
}