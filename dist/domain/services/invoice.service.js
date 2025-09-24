"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const uuidGen_1 = require("../../helper/uuidGen");
const Database_1 = require("../../infrastructure/database/Database");
const InvoiceMapper_1 = require("../mappers/InvoiceMapper");
const invoice_queries_1 = require("../../infrastructure/database/queries/invoice.queries");
class InvoiceService {
    constructor(patientService) {
        this.getInvoices = async (args) => {
            const invoiceQ = (0, invoice_queries_1.invoiceQueries)('read', args);
            try {
                const invoiceResp = await Database_1.Database.execute(invoiceQ);
                const totalRegistries = invoiceResp.length > 0 ? invoiceResp[0].total_registries : 0;
                return {
                    invoiceResp,
                    totalRegistries
                };
            }
            catch (err) {
                console.log('error reading invoices ::: ', err.message);
                throw err;
            }
        };
        this.createInvoice = async (createInvoicePayload) => {
            const invoiceNum = (0, uuidGen_1.generateShortenedUuid)();
            if (createInvoicePayload.origin)
                delete createInvoicePayload.service;
            const mappedFields = InvoiceMapper_1.InvoiceMapper.toDbForm({
                ...createInvoicePayload,
                invoiceNum,
                IsActive: true,
                state: createInvoicePayload.origin ? 'Pagado' : 'Pendiente',
            });
            const translatedFields = this.removeUndefined(mappedFields);
            const { query, values } = this.buildInsertQuery('facturas', translatedFields);
            try {
                const resp = await Database_1.Database.execute(query, values);
                const { insertId } = resp;
                return insertId;
            }
            catch (err) {
                console.log('error creating invoice ::: ', err.message);
                throw err;
            }
        };
        this.getInvById = async (invNumber) => {
            const queryForInv = (0, invoice_queries_1.invoiceQueries)('get-one');
            try {
                const invoice = await Database_1.Database.execute(queryForInv, [invNumber]);
                return InvoiceMapper_1.InvoiceMapper.toResp(invoice[0]);
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.updateInvById = async (id, updInvoicePayload) => {
            const mappedFields = InvoiceMapper_1.InvoiceMapper.toDbForm({
                ...updInvoicePayload,
                invoiceNum: id,
                state: 'Pagado'
            });
            const translatedFields = this.removeUndefined(mappedFields);
            delete translatedFields.invoiceNum;
            delete translatedFields['InvoiceNumber'];
            const entries = Object.entries(translatedFields).map(([key, value]) => {
                return [key, value === undefined ? null : value];
            });
            const setClauses = entries.map(([key]) => `\`${key}\` = ?`).join(', ');
            const values = entries.map(([, value]) => value ?? null);
            const sql = `
            UPDATE \`cami-vime\`.\`facturas\`
            SET ${setClauses}
            WHERE \`InvoiceNumber\` = ?
        `;
            try {
                await Database_1.Database.execute(sql, [...values, id]);
                return {
                    id
                };
            }
            catch (err) {
                console.error('Error en updateInvById:', err);
                throw new Error(err?.message || 'Error desconocido');
            }
        };
        this.removeInvoiceById = async (invoiceId) => {
            const invQ = (0, invoice_queries_1.invoiceQueries)('delete');
            const values = [0, invoiceId];
            try {
                await Database_1.Database.execute(invQ, values);
                return true;
            }
            catch (err) {
                console.error('Error deleting Invoice by Id ::::: ', err);
                throw err;
            }
        };
        this.getRawData = async () => {
            const servicesQ = (0, invoice_queries_1.invoiceQueries)('getServices');
            const pMethodsQ = (0, invoice_queries_1.invoiceQueries)('getPaymentMethods');
            const allDocsQ = (0, invoice_queries_1.invoiceQueries)('all-docs');
            try {
                const resp = await Promise.all([
                    this.patientService.findAllPatients({ limit: 25, offset: 0 }),
                    Database_1.Database.execute(servicesQ),
                    Database_1.Database.execute(pMethodsQ),
                    Database_1.Database.execute(allDocsQ)
                ]);
                const [patientsResp, servicesResp, paymentMethodsResp, doctorsResp] = resp;
                const services = servicesResp.map((s) => ({
                    id: s.ServicioID,
                    serviceName: s.NombreServicio,
                    serviceDescription: s.Descripcion,
                    servicePrice: parseFloat(s.Precio)
                }));
                const paymentMethods = paymentMethodsResp.map((p) => ({
                    id: p.TipoPagoID,
                    paymentDescription: p.Descripcion
                }));
                const doctors = doctorsResp.map((d) => ({
                    id: d.PersonalID,
                    name: d.NombreDoctor
                }));
                return {
                    patients: patientsResp.patients,
                    services,
                    paymentMethods,
                    doctors
                };
            }
            catch (err) {
                throw new Error(err.message);
            }
        };
        this.patientService = patientService;
    }
    buildInsertQuery(table, data) {
        const keys = Object.keys(data);
        const columns = keys.join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map((key) => data[key]);
        const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders});`;
        return { query, values };
    }
    removeUndefined(obj) {
        return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== undefined));
    }
}
exports.InvoiceService = InvoiceService;
