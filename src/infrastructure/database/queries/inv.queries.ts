interface Delimiters {
    limit: number,
    offset: number,
    term: string
}

export const inventoryQueries = ( key: string, params?: Delimiters ): string => {
    let query: string = ''
    if ( key === 'all-inv' ) {
        const { limit, offset, term } = params!
        console.log('the params ::: ', params)
        const hasTerm = !!term
        query = `
            select
                inv.ProductoID,
                inv.NombreProducto,
                inv.Descripcion,
                inv.PrecioUnidad,
                inv.Cantidad,
                count(*) over() as total_registries
            from
                Inventario as inv
            where
                1=1
                ${hasTerm ? `and inv.NombreProducto like concat('%', '${term}', '%')` : ''}
            limit ${limit} offset ${offset};
        `
    }

    return query
}