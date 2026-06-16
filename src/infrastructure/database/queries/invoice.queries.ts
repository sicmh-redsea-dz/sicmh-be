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
                    f.InvoiceNumber like concat('%', '${term}', '%') or
                    p.Nombre like concat('%', '${term}', '%') or
                    p.Apellido like concat('%', '${term}', '%')
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
                    f.DescuentoElderly,
                    f.CodigoPromocional,
                    f.DescuentoPromocional,
                    f.AseguradoraID,
                    f.RTN,
                    f.CAI,
                    f.InvoiceNumber,
                    f.TipoPagoID,
                    hm.TipoVisita
                from
                    facturas as f
                    left join historia_medica as hm
                        on hm.FacturaID = f.FacturaID
                where
                    f.InvoiceNumber = ?
                group by
                    f.FacturaID, f.PacienteID, f.PersonalID, f.FechaFactura, f.Monto, f.Estado, f.InvoiceNumber, f.TipoPagoID, hm.TipoVisita;
            `
            break
        case 'find-pending-by-patient':
            query = `
                select
                    f.FacturaID,
                    f.PacienteID,
                    f.FechaFactura,
                    f.Monto,
                    f.Estado,
                    f.InvoiceNumber
                from
                    facturas as f
                where
                    f.IsActive = 1
                    and f.PacienteID = ?
                    and f.Estado = 'Pendiente'
                    and DATE(f.FechaFactura) <= DATE(?)
                order by
                    f.FechaFactura desc
                limit 1;
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
                    servicios as s
                order by
                    s.ServicioID asc;
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





        // consultas para PDF
        case 'report-header':
            query = `
                SELECT
                    DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS fecha_actual,
                    CASE
                        WHEN ? = 'td' THEN DATE_FORMAT(CURDATE(), '%d %b %Y')
                        ELSE CONCAT(
                            DATE_FORMAT(CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY, '%d %b %Y'),
                            ' - ',
                            DATE_FORMAT(CURDATE(), '%d %b %Y')
                        )
                    END AS rango_fechas,
                    'Cajero General' AS cajero,
                    '08:00 - 17:00' AS turno;
            `;
            break;

        case 'report-summary':
            query = `
                SELECT
                    CASE WHEN f.Estado = 'Pagado' THEN 'Pagado' ELSE 'Pendiente' END AS estado_factura,
                    COUNT(*) AS cantidad_facturas,
                    IFNULL(SUM(f.Monto), 0) AS total_monto
                FROM 
                    facturas AS f
                WHERE
                    f.IsActive = 1
                    AND DATE(f.FechaFactura) BETWEEN
                        CASE WHEN ?='td' THEN CURDATE()
                            ELSE CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY
                        END
                        AND CURDATE()
                GROUP BY estado_factura
                ORDER BY estado_factura;
            `;
            break;

        case 'report-payments':
            query = `
                SELECT 
                    IFNULL(tp.Descripcion, 'Sin método') AS metodo_pago,
                    COUNT(f.FacturaID) AS cantidad,
                    IFNULL(SUM(f.Monto), 0) AS total_monto
                FROM 
                    facturas AS f
                LEFT JOIN 
                    tipo_pago AS tp ON tp.TipoPagoID = f.TipoPagoID
                WHERE 
                    f.IsActive = 1
                    AND f.Estado = 'Pagado'
                    AND DATE(f.FechaFactura) BETWEEN
                        CASE WHEN ?='td' THEN CURDATE()
                            ELSE CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY
                        END
                        AND CURDATE()
                GROUP BY 
                    IFNULL(tp.Descripcion, 'Sin método')
                ORDER BY 
                    metodo_pago;
            `;
            break;


            case 'report-cashbox':
                query = `
                    SELECT
                        'Efectivo en Caja' AS descripcion,
                        IFNULL(SUM(CASE WHEN f.TipoPagoID = 1 THEN f.Monto END), 0) AS total_sistema,
                        CAST(NULL AS DECIMAL(18,2)) AS conteo_manual,
                        CAST(NULL AS DECIMAL(18,2)) AS diferencia
                        FROM facturas AS f
                        WHERE 
                        f.IsActive = 1
                        AND f.Estado = 'Pagado'
                        AND DATE(f.FechaFactura) BETWEEN
                            CASE WHEN ?='td' THEN CURDATE()
                                ELSE CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY
                            END
                            AND CURDATE()

                        UNION ALL

                        SELECT
                        'Tarjeta' AS descripcion,
                        IFNULL(SUM(CASE WHEN f.TipoPagoID = 2 THEN f.Monto END), 0) AS total_sistema,
                        CAST(NULL AS DECIMAL(18,2)) AS conteo_manual,
                        CAST(NULL AS DECIMAL(18,2)) AS diferencia
                        FROM facturas AS f
                        WHERE 
                        f.IsActive = 1
                        AND f.Estado = 'Pagado'
                        AND DATE(f.FechaFactura) BETWEEN
                            CASE WHEN ?='td' THEN CURDATE()
                                ELSE CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY
                            END
                            AND CURDATE()

                        UNION ALL

                    SELECT
                        'Transferencia' AS descripcion,
                        IFNULL(SUM(CASE WHEN f.TipoPagoID = 3 THEN f.Monto END), 0) AS total_sistema,
                        CAST(NULL AS DECIMAL(18,2)) AS conteo_manual,
                        CAST(NULL AS DECIMAL(18,2)) AS diferencia
                        FROM facturas AS f
                        WHERE 
                        f.IsActive = 1
                        AND f.Estado = 'Pagado'
                        AND DATE(f.FechaFactura) BETWEEN
                            CASE WHEN ?='td' THEN CURDATE()
                                ELSE CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY
                            END
                            AND CURDATE();
                `;
                break;

        default:
            query = ''
            break
    }
    return query
}
