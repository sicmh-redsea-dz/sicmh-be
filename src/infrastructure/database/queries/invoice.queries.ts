export const invoiceQueries = (key: string): string => {
    let query: string = ''
    switch( key ) {
        case 'get-one':
            query = `
                select 
                    f.FacturaID,
                    f.PacienteID,
                    f.PersonalID,
                    f.FechaFactura,
                    f.Monto,
                    f.Estado,
                    f.InvoiceNumber,
                    f.TipoPagoID,
                    hm.TipoVisita
                from 
                    facturas as f
                    inner join historia_medica as hm
                        on hm.FacturaID = f.FacturaID
                where
                    f.InvoiceNumber = ?
                group by 
                    f.FacturaID, f.PacienteID, f.PersonalID, f.FechaFactura, f.Monto, f.Estado, f.InvoiceNumber, f.TipoPagoID, hm.TipoVisita;
            `
            break
        case 'get-stock-invoice':
            query = `
                select 
                    fi.FacturaInventarioID, 
                    fi.ProductoID
                from Factura_Inventario as fi 
                where fi.FacturaID = ?;
            `
            break
        case 'create':
            query = `
                insert into facturas(PacienteID, DoctorID, FechaFactura, Monto, Estado, InvoiceNumber, TipoPagoID)
                values(?, ?, ?, ?, ?, ?, ?);
            `
            break
        case 'getServices':
            query = `
                select 
                    s.* 
                from 
                    servicios as s;
            `
            break;
        case 'getPaymentMethods':
            query = `
                select 
                    tp.* 
                from 
                    tipo_pago as tp;
            `
            break;
        case 'all-docs':
            query = `
                select
                    p.PersonalID, concat(p.Nombre, ' ', p.Apellido) as NombreDoctor
                from 
                    personal as p;
            `
            break
        case 'delete':
            query = `
                update facturas as f
                set f.IsActive = ?
                where f.InvoiceNumber = ?;
            `
            break
        default:
            query = ''
            break
    }
    return query
}


