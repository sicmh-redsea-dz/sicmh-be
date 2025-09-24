"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockMapper = void 0;
class StockMapper {
    static toStockResponse(stock) {
        const { ProductoID: id, NombreProducto: productName, Descripcion: productDescription, Cantidad: productQuantity, PrecioUnidad: productUnitPrice } = stock;
        return {
            id,
            productName,
            productDescription,
            productQuantity,
            productUnitPrice: +productUnitPrice
        };
    }
}
exports.StockMapper = StockMapper;
