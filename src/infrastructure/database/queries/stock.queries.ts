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
                    inv.Cantidad > 0
                order by 
                    inv.NombreProducto asc;
            `
            break
    }

    return query
}