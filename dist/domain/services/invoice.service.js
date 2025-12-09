"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const uuidGen_1 = require("../../helper/uuidGen");
const Database_1 = require("../../infrastructure/database/Database");
const InvoiceMapper_1 = require("../mappers/InvoiceMapper");
const invoice_queries_1 = require("../../infrastructure/database/queries/invoice.queries");
const puppeteer_1 = __importDefault(require("puppeteer"));
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
        this.generateCloseReportPdf = async (term) => {
            let browser;
            try {
                const [headerData, summaryData, paymentsData, cashbox] = await Promise.all([
                    Database_1.Database.execute((0, invoice_queries_1.invoiceQueries)('report-header'), [term]),
                    Database_1.Database.execute((0, invoice_queries_1.invoiceQueries)('report-summary'), [term]),
                    Database_1.Database.execute((0, invoice_queries_1.invoiceQueries)('report-payments'), [term]),
                    Database_1.Database.execute((0, invoice_queries_1.invoiceQueries)('report-cashbox'), [term, term, term]),
                ]);
                const html = this.renderCloseReportTemplate({
                    header: headerData[0],
                    summary: summaryData,
                    payments: paymentsData,
                    cashbox: cashbox
                });
                browser = await puppeteer_1.default.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                const page = await browser.newPage();
                await page.setContent(html, { waitUntil: 'networkidle0' });
                const pdfBuffer = await page.pdf({
                    format: 'A4',
                    printBackground: true
                });
                return pdfBuffer;
            }
            catch (err) {
                console.error('Error generando PDF: ', err?.message || err);
                throw err;
            }
            finally {
                if (browser)
                    await browser.close().catch(() => { });
            }
        };
        this.renderCloseReportTemplate = (args) => {
            const { header, summary, payments, cashbox } = args;
            const summaryRows = summary.map((r) => `
            <tr>
                <td>${r.estado_factura}</td>
                <td>${r.cantidad_facturas}</td>
                <td>${Number(r.total_monto).toFixed(2)}</td>
            </tr>`).join('');
            const paymentRows = payments.map((r) => `
            <tr>
                <td>${r.metodo_pago}</td>
                <td>${r.cantidad}</td>
                <td>${Number(r.total_monto).toFixed(2)}</td>
            </tr>`).join('');
            const cashboxRows = cashbox.map((r) => `
            <tr>
                <td>${r.descripcion}</td>
                <td>${Number(r.total_sistema).toFixed(2)}</td>
                <td>${r.conteo_manual ?? ''}</td>
                <td>${r.diferencia ?? ''}</td>
            </tr>`).join('');
            return `
        <!DOCTYPE html>
        <html>
            <head>
            <meta charset="UTF-8">
            <style>
                * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Roboto', sans-serif;
                }
                body {
                margin: 2cm;
                font-size: 12px;
                }
                h1 {
                text-align: left;
                font-size: 2rem;
                font-weight: 500;
                margin-bottom: 1rem;
                color: #17365D;
                }
                .divider {
                border-top: 2px solid #B1C7E2;
                margin: 1rem 0 2rem 0;
                }
                .section { margin-bottom: 1.5rem; }
                .section.no-border .info-pair {
                display: flex;
                margin-bottom: 4px;
                font-size: 16px;
                }
                .section.no-border .label { margin-right: 16px; }
                .section.no-border .value {
                font-weight: bold;
                text-align: right;
                margin-left: auto;
                }
                .section-title {
                font-weight: bold;
                margin-bottom: 0.5rem;
                text-decoration: underline;
                font-size: 16px;
                }
                table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 0.5rem;
                }
                th, td {
                border: 1px solid #999;
                padding: 6px;
                text-align: left;
                font-size: 14px;
                }
                .no-border td {
                border: none;
                padding: 4px;
                }
                .signature-line {
                margin-top: 4rem;
                display: flex;
                justify-content: space-between;
                }
                .signature-line div {
                width: 45%;
                border-top: 1px solid #000;
                text-align: center;
                font-size: 11px;
                padding-top: 0.2rem;
                }
            </style>
            </head>
            <body>
            <h1>MedIT - Reporte de Cierre de Caja</h1>
            <div class="divider"></div>

            <div class="section no-border">
                <div class="info-pair"><span class="label" style="margin-right: 34px;">Fecha:</span><span class="value">${header?.fecha_actual}</span></div>
                <div class="info-pair"><span class="label" style="margin-right: 34px;">Rango:</span><span class="value">${header?.rango_fechas}</span></div>
                <div class="info-pair"><span class="label">Cajero/a:</span><span class="value">${header?.cajero}</span></div>
                <div class="info-pair"><span class="label" style="margin-right: 34px;">Turno:</span><span class="value">${header?.turno}</span></div>
            </div>

            <div class="section">
                <div class="section-title">Resumen de Ventas</div>
                <table>
                <thead>
                    <tr><th>Categoría</th><th>Cantidad</th><th>Total (L.)</th></tr>
                </thead>
                <tbody>
                    ${summaryRows}
                </tbody>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Detalle de Métodos de Pago</div>
                <table>
                <thead>
                    <tr><th>Método de Pago</th><th>Monto (L.)</th><th>Notas</th></tr>
                </thead>
                <tbody>
                    ${paymentRows}
                </tbody>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Caja y Reconciliación</div>
                <table>
                <thead>
                    <tr>
                    <th>Descripción</th><th>Total del Sistema</th><th>Conteo Manual</th><th>Diferencia</th>
                    </tr>
                </thead>
                <tbody>
                    ${cashboxRows}
                </tbody>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Observaciones</div>
                <p>[Diferencias, explicaciones o incidencias observadas]</p>
            </div>

            <div class="signature-line">
                <div>Firma Cajero/a</div>
                <div>Firma Supervisor/a</div>
            </div>
            </body>
        </html>
        `;
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
