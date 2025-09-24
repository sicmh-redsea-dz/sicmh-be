"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.softDeleteVisit = exports.editVisit = exports.createVisit = exports.getOneVisit = exports.getVisits = void 0;
const db_1 = require("../config/db");
const visits_srvc_1 = require("../services/visits.srvc");
const patients_srvc_1 = require("../services/patients.srvc");
const stock_srvc_1 = require("../services/stock.srvc");
const invoice_srvc_1 = require("../services/invoice.srvc");
const visitsService = new visits_srvc_1.VisitsService(db_1.pool);
const patientsService = new patients_srvc_1.PatientsService(db_1.pool);
const stockService = new stock_srvc_1.StockService(db_1.pool);
const invoiceService = new invoice_srvc_1.InvoiceService(db_1.pool);
const getVisits = async (req, res) => {
    const limit = parseInt((req.query.limit || '25').toString());
    const offset = parseInt((req.query.offset || '0').toString());
    if (isNaN(limit) || limit <= 0 || isNaN(offset) || offset < 0) {
        res.status(400).json({
            error: 'Invalid pagination parameters. "limit" must be a positive integer and "offset" must be a non-negative integer.'
        });
        return;
    }
    const pagination = { limit, offset };
    const [[visits, totalRegistries], doctors, patients, stock] = await Promise.all([
        visitsService.findAll(pagination),
        visitsService.findAllDocs(),
        patientsService.findAll(true),
        stockService.findall()
    ]);
    res.status(200).json({
        data: {
            visits,
            patients,
            doctors,
            stock,
            totalVisitsCount: visits.length,
            totalPatientsCount: patients.length,
            totalDoctorsCount: doctors.length,
            totalRegistries: totalRegistries
        }
    });
};
exports.getVisits = getVisits;
const getOneVisit = async (req, res) => {
    const { id } = req.params;
    const visit = await visitsService.findOneVisit(id);
    res.status(200).json({
        data: {
            visit
        }
    });
};
exports.getOneVisit = getOneVisit;
const createVisit = async (req, res) => {
    const visitFormData = req.body;
    const { date, doctor, patient, stockItems: stock } = visitFormData;
    const { origin } = req.params;
    if (origin === 'er')
        invoiceService.createInvoice({ amount: '0', date, doctor, patient, pMethod: '1', service: [], stock });
    const response = await visitsService.saveNewVisit(visitFormData, origin);
    res.status(201).json({
        data: {
            visit: response
        }
    });
};
exports.createVisit = createVisit;
const editVisit = async (req, res) => {
    const { id } = req.params;
    const args = req.body;
    const updatedVisitId = await visitsService.editVisit(id, args);
    res.status(200).json({
        data: {
            id: updatedVisitId
        }
    });
};
exports.editVisit = editVisit;
const softDeleteVisit = async (req, res) => {
    const { id } = req.params;
    await visitsService.softDeletePatient(parseInt(id));
    res.status(200).json({
        data: {
            msg: 'ok'
        }
    });
};
exports.softDeleteVisit = softDeleteVisit;
