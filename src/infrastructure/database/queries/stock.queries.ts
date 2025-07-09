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
        default:
            query = ''
            break
    }

    return query
}

