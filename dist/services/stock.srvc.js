"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockService = void 0;
const queries_1 = require("../helper/stock/queries");
class StockService {
    constructor(pool) {
        this.pool = pool;
    }
    async findall() {
        let query = (0, queries_1.queries)('get');
        try {
            const [response] = await this.pool.execute(query);
            const formattedData = this.formatData(response);
            return formattedData;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    formatData(data) {
        return data.map((item) => {
            return {
                id: item.ProductoID,
                productName: item.NombreProducto,
                productDescription: item.Descripcion,
                quantity: item.Cantidad
            };
        });
    }
}
exports.StockService = StockService;
