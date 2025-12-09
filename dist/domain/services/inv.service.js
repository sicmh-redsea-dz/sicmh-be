"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvService = void 0;
const Database_1 = require("../../infrastructure/database/Database");
const inv_queries_1 = require("../../infrastructure/database/queries/inv.queries");
const InvMapper_1 = require("../mappers/InvMapper");
class InvService {
    constructor() {
        this.getInventory = async (pagParams, subinvId) => {
            let invQ = (0, inv_queries_1.inventoryQueries)('all-inv', { pagDelimeters: pagParams });
            try {
                const resp = await Database_1.Database.execute(invQ, [subinvId]);
                const totalRegistries = resp.length > 0 ? resp[0].total_registries : 0;
                return {
                    resp: resp.map((item) => InvMapper_1.InvMapper.toInvResponse(item)),
                    totalRegistries
                };
            }
            catch (err) {
                console.log('the err :::: ', err.message);
                throw err;
            }
        };
        this.getInventoryById = async (id) => {
            let invQ = (0, inv_queries_1.inventoryQueries)('inv-by-id');
            try {
                const resp = await Database_1.Database.execute(invQ, [id]);
                return InvMapper_1.InvMapper.toInvResponse(resp[0]);
            }
            catch (err) {
                console.log('the err :::: ', err.message);
                throw err;
            }
        };
        this.transferInventory = async (data) => {
            let invQ = (0, inv_queries_1.inventoryQueries)('inv-transfer-id', { transferArgs: data });
            try {
                const resp = await Database_1.Database.execute(invQ, [data]);
                return resp;
            }
            catch (err) {
                console.log('the err :::: ', err.message);
                throw err;
            }
        };
        this.create = async (data) => {
            const translatedData = InvMapper_1.InvMapper.toInvFormResponse(data);
            translatedData['PrecioUnidad'] = Number(translatedData['PrecioUnidad']);
            translatedData['NivelMinimoStock'] = Number(translatedData['NivelMinimoStock']);
            translatedData['Cantidad'] = Number(translatedData['Cantidad']);
            const { query, values } = this.buildInsertQuery('Inventario', translatedData);
            try {
                const resp = await Database_1.Database.execute(query, values);
                const { insertId } = resp;
                await Database_1.Database.execute(`
                    insert into ExistenciasInventario (ProductoID,SubinventarioID,Cantidad) values (?,?,?);
                `, [insertId, 1, translatedData['Cantidad']]);
                return this.getInventoryById(String(insertId));
            }
            catch (err) {
                console.log('the err :::: ', err.message);
                throw err;
            }
        };
        this.patchArticle = async (data, id) => {
            const { prodDesc, prodMinStock, prodName, prodQty, prodUnitPrice } = data;
            const query = (0, inv_queries_1.inventoryQueries)('update');
            try {
                let updatedItem = await Database_1.Database.execute(query, [prodName, prodDesc, prodUnitPrice, prodQty, prodMinStock, prodQty, id]);
                const { affectedRows } = updatedItem;
                if (affectedRows === 0)
                    throw this.errorHandler('not_found_error', `No article found with Id: ${id}, to update`);
                return await this.getInventoryById(String(id));
            }
            catch (err) {
                console.log('the err :::: ', err.message);
                throw err;
            }
        };
        this.errorHandler = (name, msg) => {
            const err = new Error();
            err.name = name;
            err.message = msg;
            return err;
        };
    }
    buildInsertQuery(table, data) {
        const keys = Object.keys(data);
        const columns = keys.join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map((key) => data[key]);
        const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders});`;
        return { query, values };
    }
}
exports.InvService = InvService;
