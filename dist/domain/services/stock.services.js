"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockService = void 0;
const Database_1 = require("../../infrastructure/database/Database");
const StockMapper_1 = require("../mappers/StockMapper");
const stock_queries_1 = require("../../infrastructure/database/queries/stock.queries");
class StockService {
    constructor() {
        this.findAll = async () => {
            const stockQ = (0, stock_queries_1.stockQueries)('find-all');
            try {
                const stock = await Database_1.Database.execute(stockQ);
                return stock.map(item => StockMapper_1.StockMapper.toStockResponse(item));
            }
            catch (err) {
                throw err;
            }
        };
        this.readAmountByStockQty = async (items) => {
            const ids = items.map(item => item.id);
            const caseStatements = items
                .map(item => `WHEN ${item.id} THEN ${item.qty}`)
                .join(' ');
            const query = `
            select sum(PrecioUnidad * case ProductoID
                ${caseStatements}
                else 0
                end) AS total
            from 
                Inventario
            where 
                ProductoID in (${ids.join(', ')});
        `;
            try {
                const result = await Database_1.Database.execute(query);
                return result[0]?.total ?? 0.00;
            }
            catch (err) {
                throw err;
            }
        };
        this.reduceStockQuantities = async (items) => {
            if (!items.length)
                return;
            // ID del subinventario "General" o el que quieras como default
            const DEFAULT_SUBINVENTARIO_ID = 1;
            try {
                const promises = items.map(item => {
                    const subinvOrigen = item.subinventoryId ?? DEFAULT_SUBINVENTARIO_ID;
                    const query = `CALL sp_mov_inventario(?, ?, ?, ?, ?);`;
                    const values = [
                        'SALIDA',
                        item.id,
                        item.qty,
                        subinvOrigen,
                        null
                    ];
                    return Database_1.Database.execute(query, values);
                });
                await Promise.all(promises);
            }
            catch (err) {
                console.error('error reducing stock quantities: ', err);
                throw err;
            }
        };
        this.insertStockInvoice = async (facturaId, items) => {
            if (!items.length)
                return;
            const values = items
                .map(({ id, qty }) => `(${facturaId}, ${id}, ${qty})`)
                .join(', ');
            const query = `
            insert into Factura_Inventario (FacturaID, ProductoID, Cantidad)
            values ${values}
        `;
            try {
                await Database_1.Database.execute(query);
            }
            catch (err) {
                throw err;
            }
        };
        this.insertStockHistory = async (historyId, items) => {
            if (!items.length)
                return;
            const values = items
                .map(({ id, qty }) => `(${id}, ${historyId}, ${qty})`)
                .join(', ');
            const query = `
            insert into Inventario_HistoriaMedica (InventarioID, HistoriaMedicaID, CantidadUsada)
            values ${values}
        `;
            try {
                await Database_1.Database.execute(query);
            }
            catch (err) {
                console.log('error inserting stock history: ', err.message);
                throw err;
            }
        };
    }
}
exports.StockService = StockService;
