interface Delimiters {
  limit: number,
  offset: number,
  term: string,
}

export const invoiceQueries = (key: string, delimiters?: Delimiters): string => {
    let query: string = ''
    switch( key ) {
        case 'read':
            const { limit, offset, term } = delimiters!
            const hasTerm = !!term
            const whereClause = `
                f.FacturaID > 4 and f.IsActive = true
                ${hasTerm ? `and (
                    f.InvoiceNumber like concat('%', '${term}', '%')
                )`: ''}    
            `
            query = `
                    select 
                        f.FacturaID, 
                        concat(p.Nombre, ' ', p.Apellido) as Paciente, 
                        concat(d.Nombre, ' ', d.Apellido) as Doctor, 
                        f.FechaFactura, 
                        f.Estado, 
                        f.Monto,
                        f.InvoiceNumber,
                        count(*) over() as total_registries
                    from 
                        facturas as f
                        inner join 
                            personal as d
                            on d.PersonalID = f.PersonalID
                        inner join 
                            pacientes as p
                            on p.PacienteID = f.PacienteID
                    where 
                        ${whereClause}
                    order by 
                        f.FechaFactura desc
                    limit ${limit}
                    offset ${offset};
            `
            break
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


