import { Stock } from '../entities/Stock'
import { StockResponse } from '../responses/StockResponse'

export class StockMapper {
    static toStockResponse(stock: Stock): StockResponse {
        const { 
            ProductoID: id, 
            NombreProducto: productName, 
            Descripcion: productDescription, 
            Cantidad: productQuantity,
            PrecioUnidad: productUnitPrice 
        } = stock

        return {
            id,
            productName,
            productDescription,
            productQuantity,
            productUnitPrice: +productUnitPrice
        }
    }
}