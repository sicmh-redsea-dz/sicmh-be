"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitsService = void 0;
const Database_1 = require("../../infrastructure/database/Database");
const visits_queries_1 = require("../../infrastructure/database/queries/visits.queries");
const HistoryMapper_1 = require("../mappers/HistoryMapper");
const StaffMapper_1 = require("../mappers/StaffMapper");
const PatientMapper_1 = require("../mappers/PatientMapper");
const StockMapper_1 = require("../mappers/StockMapper");
class VisitsService {
    constructor(staffService, patientService, stockService, invoiceService) {
        this.findAllVisits = async (args) => {
            let visitQ = (0, visits_queries_1.visitsQueries)('all-visits', args);
            try {
                const visitHistory = await Database_1.Database.execute(visitQ);
                const totalRecords = visitHistory.length > 0 ? visitHistory[0].total_registries : 0;
                const staff = await this.staffService.getAllDocs();
                const patients = await this.patientService.findAllPatients({ limit: 100, offset: 0 });
                return {
                    visits: visitHistory.map(visit => HistoryMapper_1.HistoryMapper.toHistoryResponse(visit)),
                    staff,
                    patients: patients.patients,
                    totalRecords
                };
            }
            catch (err) {
                console.log('the err :::: ', err.message);
                throw err;
            }
        };
        this.findVisitById = async (id) => {
            const visitQ = (0, visits_queries_1.visitsQueries)('one-visit');
            try {
                const medicalHistory = await Database_1.Database.execute(visitQ, [id]);
                const stock = await this.stockService.findAll();
                return {
                    visit: HistoryMapper_1.HistoryMapper.toHistoryFormResponse(medicalHistory[0]),
                    stock
                };
            }
            catch (err) {
                throw err;
            }
        };
        this.createVisit = async (createVisitPayload) => {
            const { stockItems, date, doctor, patient, origin } = createVisitPayload;
            const fieldsForVisit = HistoryMapper_1.HistoryMapper.toDbForm(createVisitPayload);
            const translatedFields = this.removeUndefined(fieldsForVisit);
            const validExt = {
                visits: 'Consulta',
                emergency: 'Emergencia',
                hospitalization: 'Hospitalizacion',
                oroom: 'Quirofano'
            };
            translatedFields['isActive'] = true;
            translatedFields['TipoVisita'] = validExt[origin];
            try {
                let amount = 0.00;
                if (stockItems && stockItems.length > 0)
                    amount = await this.stockService.readAmountByStockQty(stockItems);
                translatedFields['FacturaID'] = await this.invoiceService.createInvoice({ date, doctor, patient, amount });
                const { query, values } = this.buildInsertQuery('historia_medica', translatedFields);
                const resp = await Database_1.Database.execute(query, values);
                const { insertId } = resp;
                if (stockItems && stockItems.length > 0) {
                    await this.stockService.reduceStockQuantities(stockItems);
                    await this.stockService.insertStockInvoice(translatedFields['FacturaID'], stockItems);
                    await this.stockService.insertStockHistory(insertId, stockItems);
                }
                return {
                    visit: insertId
                };
            }
            catch (err) {
                console.error('error creating visit: ', err);
                throw err;
            }
        };
        this.editVisit = async (editVisitPayload) => {
            const { id, body } = editVisitPayload;
            const fieldsForVisit = HistoryMapper_1.HistoryMapper.toDbForm(body);
            const translatedFields = this.removeUndefined(fieldsForVisit);
            translatedFields.HistoriaID = id;
            try {
                const { query, values } = this.generateUpdateQuery('historia_medica', translatedFields);
                const updatedVisit = await Database_1.Database.execute(query, values);
                const { affectedRows } = updatedVisit;
                if (affectedRows === 0) {
                    throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`);
                }
                return this.findVisitById(+id);
            }
            catch (err) {
                console.log('Error editing visit:', err);
                throw err;
            }
        };
        this.deleteVisit = async (id) => {
            const visitQ = (0, visits_queries_1.visitsQueries)('delete-visit');
            try {
                const deletedVisit = await Database_1.Database.execute(visitQ, [id]);
                const { affectedRows } = deletedVisit;
                if (affectedRows == 0)
                    throw this.errorHandler('not_found_error', `No visit found with Id: ${id}, to update`);
                return `Visit Id: ${id} deleted`;
            }
            catch (err) {
                throw err;
            }
        };
        this.getDoctors = async (term) => {
            const visitQ = (0, visits_queries_1.visitsQueries)('get-doctor', { term });
            try {
                const resp = await Database_1.Database.execute(visitQ);
                return {
                    doctors: resp.map(x => StaffMapper_1.StaffMapper.toStaffResponse(x))
                };
            }
            catch (err) {
                console.log('error getting doctors :::: ', err.message);
                throw err;
            }
        };
        this.getPatients = async (term) => {
            const visitQ = (0, visits_queries_1.visitsQueries)('get-patients', { term });
            try {
                const resp = await Database_1.Database.execute(visitQ);
                return {
                    patients: resp.map(x => PatientMapper_1.PatientMapper.toShortPatientsResponse(x))
                };
            }
            catch (err) {
                console.log('error getting doctors :::: ', err.message);
                throw err;
            }
        };
        this.getStockItems = async (term) => {
            const visitQ = (0, visits_queries_1.visitsQueries)('get-stock-items');
            try {
                const resp = await Database_1.Database.execute(visitQ, [term]);
                return {
                    stock: resp.map(x => StockMapper_1.StockMapper.toStockResponse(x))
                };
            }
            catch (err) {
                console.log('error getting stock items :::: ', err.message);
                throw err;
            }
        };
        this.errorHandler = (name, msg) => {
            const err = new Error();
            err.name = name;
            err.message = msg;
            return err;
        };
        this.staffService = staffService;
        this.patientService = patientService;
        this.stockService = stockService;
        this.invoiceService = invoiceService;
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
    generateUpdateQuery(tableName, data, idField = 'HistoriaID') {
        if (!data[idField]) {
            throw new Error(`El campo ${idField} es requerido para la actualización`);
        }
        const fieldsToUpdate = Object.keys(data).filter(key => key !== idField);
        if (fieldsToUpdate.length === 0) {
            throw new Error('No hay campos válidos para actualizar');
        }
        const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
        const values = fieldsToUpdate.map(field => data[field]);
        values.push(data[idField]);
        const query = `update ${tableName} set ${setClause} where ${idField} = ?;`;
        return { query, values };
    }
}
exports.VisitsService = VisitsService;
