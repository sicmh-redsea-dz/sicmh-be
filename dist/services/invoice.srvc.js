"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const uuid_1 = require("uuid");
const queries_1 = require("../helper/invoices/queries");
class InvoiceService {
    constructor(pool) {
        this.pool = pool;
    }
    async findAll() {
        let query = (0, queries_1.queries)('get');
        try {
            const [response] = await this.pool.execute(query);
            return response;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    async findOne(id) {
        const queryForInvoice = (0, queries_1.queries)('get-one');
        const queryForStockInvoice = (0, queries_1.queries)('get-stock-invoice');
        try {
            const [response] = await this.pool.execute(queryForInvoice, [id]);
            const formattedData = this.formatResponse(response);
            const [responseStockDetail] = await this.pool.execute(queryForStockInvoice, [formattedData[0].invoiceId]);
            const formattedDetailData = this.formatResponseForInvoiceStock(responseStockDetail);
            return {
                invoice: formattedData[0],
                details: formattedDetailData
            };
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    async updateInvoiceData(invoiceNumber, body) {
        const { date, pMethod, amount, service } = body;
        const queryToUpdateInvoice = (0, queries_1.queries)('update-invoice');
        const queryTonInsertServices = (0, queries_1.queries)('create-service-invoice');
        try {
            const invoiceToUpd = await this.findOne(invoiceNumber);
            await this.pool.execute(queryToUpdateInvoice, [date, parseFloat(amount), 'Pagado', Number(pMethod), invoiceToUpd.invoice.invoiceId]);
            await Promise.all(service.map((item) => this.pool.execute(queryTonInsertServices, [invoiceToUpd.invoice.invoiceId, item])));
            return invoiceToUpd.invoice.invoiceId;
        }
        catch (err) {
            throw new Error(err);
        }
    }
    async newInvoiceData() {
        let queryForServices = (0, queries_1.queries)('getServices');
        let queryForPaymentMethods = (0, queries_1.queries)('getPaymentMethods');
        try {
            const response = await Promise.all([
                this.pool.execute(queryForServices),
                this.pool.execute(queryForPaymentMethods)
            ]);
            const [formattedServices, formattedPaymentMeths] = this.formatResponseForNewInvoice(response);
            return [formattedServices, formattedPaymentMeths];
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    async softDeleteInvoice(invoiceId) {
        const query = (0, queries_1.queries)('soft-delete');
        const value = [0, invoiceId];
        try {
            await this.pool.execute(query, value);
            return true;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    async createInvoice(invoiceForm) {
        console.log(invoiceForm);
        const { date, doctor, pMethod, patient, amount, service, stock } = invoiceForm;
        const invoiceNumber = this.generateShortenedUuid();
        const values = [parseInt(patient), parseInt(doctor), date, parseFloat(amount), 'pendiente', invoiceNumber, pMethod];
        let queryForInvoice = (0, queries_1.queries)('create-invoice');
        let queryForServiceInvoice = (0, queries_1.queries)('create-service-invoice');
        let queryForStockInvoice = (0, queries_1.queries)('create-stock-invoice');
        try {
            const [response] = await this.pool.execute(queryForInvoice, values);
            const { insertId } = response;
            console.log(insertId);
            await Promise.all([
                ...(service.length > 0 ? service.map((item) => this.pool.execute(queryForServiceInvoice, [insertId, item])) : []),
                ...(stock.length > 0 ? stock.map((item) => this.pool.execute(queryForStockInvoice, [insertId, item.id, item.qty])) : [])
            ]);
            return insertId;
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    generateShortenedUuid() {
        const uuid = (0, uuid_1.v4)();
        const lastDashIndex = uuid.lastIndexOf('-');
        const secondLastDashIndex = uuid.lastIndexOf('-', lastDashIndex - 1);
        return uuid.substring(0, secondLastDashIndex);
    }
    formatResponse(data) {
        return data.map((item) => {
            return {
                invoiceId: item.FacturaID,
                patientId: item.PacienteID,
                doctorId: item.DoctorID,
                date: item.FechaFactura,
                state: item.Estado,
                invoiceNumber: item.InvoiceNumber,
                paymentMethod: item.TipoPagoID,
                amount: item.Subtotal
            };
        });
    }
    formatResponseForInvoiceStock(data) {
        return data.map((item) => {
            return {
                invoiceStockId: item.FacturaInventarioID,
                productId: item.ProductoID
            };
        });
    }
    formatResponseForNewInvoice(data) {
        const [services, paymentMeths] = data;
        const formattedServices = services[0].map((item) => {
            return {
                id: item.ServicioID,
                serviceName: item.NombreServicio,
                serviceDescription: item.Descripcion,
                servicePrice: item.Precio
            };
        });
        const formattedPaymentMeths = paymentMeths[0].map((item) => {
            return {
                id: item.TipoPagoID,
                paymentDescription: item.Descripcion,
            };
        });
        return [formattedServices, formattedPaymentMeths];
    }
}
exports.InvoiceService = InvoiceService;
