"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queries = void 0;
const queries = (key) => {
    let query = '';
    switch (key) {
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
        from 
          facturas as f
        inner join 
          personal as d
            on d.PersonalID = f.PersonalID
        inner join 
          pacientes as p
            on p.PacienteID = f.PacienteID
        where 
          f.FacturaID > 4 and f.IsActive = true
        order by 
          f.FechaFactura desc;
      `;
            break;
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
          f.TipoPagoID
        from facturas as f
          inner join 
            factura_inventario as fi
              on fi.FacturaID = f.FacturaID
        where 
          f.InvoiceNumber = ?
        group by 
          f.FacturaID, f.PacienteID, f.DoctorID, f.FechaFactura, f.Monto, f.Estado, f.InvoiceNumber, f.TipoPagoID;
      `;
            break;
        case 'get-stock-invoice':
            query = `
        select 
          fi.FacturaInventarioID, 
          fi.ProductoID
        from factura_inventario as fi 
        where fi.FacturaID = ?;
      `;
            break;
        case 'getServices':
            query = `
        select 
          s.* 
        from 
          servicios as s;
      `;
            break;
        case 'getPaymentMethods':
            query = `
        select 
          tp.* 
        from 
          tipo_pago as tp;
      `;
            break;
        case 'create-invoice':
            query = `
        insert into facturas(PacienteID, DoctorID, FechaFactura, Monto, Estado, InvoiceNumber, TipoPagoID)
        values(?, ?, ?, ?, ?, ?, ?);
      `;
            break;
        case 'create-service-invoice':
            query = `
        insert into factura_servicios(FacturaID, ServicioID)
        values (?, ?);
      `;
            break;
        case 'create-stock-invoice':
            query = `
        insert into factura_inventario(FacturaID, ProductoID, Cantidad)
        values (?, ?, ?);
      `;
            break;
        case 'update-invoice':
            query = `
        update facturas
        set
          FechaFactura = ?,
          Monto = ?,
          Estado = ?,
          TipoPagoID = ?
        where FacturaID = ?;
      `;
            break;
        case 'soft-delete':
            query = `
        update facturas as f
        set f.IsActive = ?
        where f.InvoiceNumber = ?;
      `;
            break;
        default:
            query = '';
            break;
    }
    return query;
};
exports.queries = queries;
