interface Delimiters {
    limit?: number,
    offset?: number,
    term?: string,
}

export const inventoryQueries = ( key: string, params?: Delimiters ): string => {
    let query: string = ''
    if ( key === 'all-inv' ) {
        const { limit, offset, term } = params!

        const hasTerm = !!term
        query = `
             SELECT
                inv.ProductoID,
                inv.NombreProducto,
                inv.Descripcion,
                inv.PrecioUnidad,
                inv.Cantidad,
                COUNT(*) OVER() AS total_registries
            FROM Inventario AS inv
            WHERE 1=1
                ${hasTerm ? `AND inv.NombreProducto LIKE CONCAT("%", ${term}, "%")` : ''}
                AND inv.Cantidad > 0
            LIMIT ${limit} OFFSET ${offset};
        `
    }

    if ( key === 'inv-by-id' ) {
        query = `
            select
                inv.ProductoID,
                inv.NombreProducto,
                inv.Descripcion,
                inv.PrecioUnidad,
                inv.Cantidad
            from
                Inventario as inv
            where
                1=1 and
                inv.ProductoID = ?;
        `
        
    }

    return query
}