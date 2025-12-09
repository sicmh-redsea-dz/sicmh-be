"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockEntries = void 0;
const stock_srvc_1 = require("../services/stock.srvc");
const db_1 = require("../config/db");
const stockService = new stock_srvc_1.StockService(db_1.pool);
const getStockEntries = async (req, res) => {
    const response = await stockService.findall();
    res.status(200).json({
        data: response,
        totalCount: response.length
    });
};
exports.getStockEntries = getStockEntries;
