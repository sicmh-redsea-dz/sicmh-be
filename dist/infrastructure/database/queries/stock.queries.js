"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockQueries = void 0;
const stockQueries = (key) => {
    let query = '';
    switch (key) {
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
            `;
            break;
        default:
            query = '';
            break;
    }
    return query;
};
exports.stockQueries = stockQueries;
