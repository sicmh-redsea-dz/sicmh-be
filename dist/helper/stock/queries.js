"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queries = void 0;
const queries = (key) => {
    let query = '';
    switch (key) {
        case 'get':
            query = `
        select 
          i.ProductoID,
          i.NombreProducto,
          i.Descripcion,
          i.Cantidad
        from inventario as i
        where i.Cantidad > 0
        order by i.NombreProducto ASC;
      `;
            break;
        default:
            query = '';
            break;
    }
    return query;
};
exports.queries = queries;
