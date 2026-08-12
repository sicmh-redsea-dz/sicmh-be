interface Delimiters {
    limit?: number,
    offset?: number,
    term?: string,
}

interface TranserArgs {
    prodId: number,
    prodQty: number,
    fromLocId: number,
    toLocId: number,
}

interface QueryParams {
    pagDelimeters?: Delimiters,
    transferArgs?: TranserArgs,
}

export const inventoryQueries = ( key: string, params?: QueryParams ): string => {
    let query: string = ''
    if ( key === 'all-inv' ) {
        const { limit, offset, term } = params!.pagDelimeters!

        const hasTerm = !!term
        query = `
            SELECT
                inv.ProductoID,
                inv.NombreProducto,
                inv.Descripcion,
                inv.PrecioUnidad,
                ei.Cantidad,
                COUNT(*) OVER() AS total_registries
            FROM Inventario AS inv
            INNER JOIN 
                ExistenciasInventario AS ei
                    on inv.ProductoID = ei.ProductoID
            WHERE 1=1
                ${hasTerm ? `AND inv.NombreProducto LIKE CONCAT("%", ?, "%")` : ''}
                AND ei.SubinventarioID = ?
                AND ei.Cantidad > 0
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

    if ( key === 'inv-transfer-id' ) {
        query = `
            CALL sp_mov_inventario('TRANSFERENCIA', ?, ?, ?, ?);
        `
    }

    if ( key === 'update' ) {
        query = `
            UPDATE Inventario AS inv
            INNER JOIN ExistenciasInventario AS ei
                ON inv.ProductoID = ei.ProductoID
            SET
                inv.NombreProducto    = ?,
                inv.Descripcion       = ?,
                inv.PrecioUnidad      = ?,
                inv.Cantidad          = ?,
                inv.NivelMinimoStock  = ?,
                ei.Cantidad           = ?
            WHERE 
                ei.SubinventarioID = 1
                AND inv.ProductoID = ?;
        `
    }

    return query
}
