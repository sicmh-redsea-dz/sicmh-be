export const stockQueries = ( key: string ):string => {
    let query: string = ''

    switch ( key ) {
        case 'find-all':
            query = `
                select
                    inv.ProductoID,
                    inv.NombreProducto,
                    inv.Descripcion,
                    inv.Cantidad,
                    inv.PrecioUnidad
                from
                    Inventario as inv
                where
                    inv.Cantidad > 0 and inv.ProductoID > 1000
                order by 
                    inv.NombreProducto asc;
            `
            break
        case 'find-by-invoice':
            query = `
                select
                    used.ProductoID as id,
                    used.qty,
                    inv.NombreProducto as name,
                    inv.PrecioUnidad as unitPrice
                from (
                    select
                        ihm.InventarioID as ProductoID,
                        sum(ihm.CantidadUsada) as qty
                    from Inventario_HistoriaMedica as ihm
                    inner join historia_medica as hm
                        on hm.HistoriaID = ihm.HistoriaMedicaID
                    where hm.FacturaID = ?
                    group by ihm.InventarioID

                    union all

                    select
                        fi.ProductoID,
                        sum(fi.Cantidad) as qty
                    from Factura_Inventario as fi
                    where
                        fi.FacturaID = ?
                        and not exists (
                            select 1
                            from Inventario_HistoriaMedica as ihm
                            inner join historia_medica as hm
                                on hm.HistoriaID = ihm.HistoriaMedicaID
                            where
                                hm.FacturaID = fi.FacturaID
                                and ihm.InventarioID = fi.ProductoID
                        )
                    group by fi.ProductoID
                ) as used
                inner join Inventario as inv
                    on inv.ProductoID = used.ProductoID
                where used.qty <> 0
                order by inv.NombreProducto asc;
            `
            break
        default:
            query = ''
            break
    }

    return query
}

