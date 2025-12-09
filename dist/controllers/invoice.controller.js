"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteInvoice = exports.newInvoice = exports.updateExistingInvoice = exports.getDataForInvoice = exports.getOneInvoice = exports.getInvoices = void 0;
const invoice_srvc_1 = require("../services/invoice.srvc");
const db_1 = require("../config/db");
const visits_srvc_1 = require("../services/visits.srvc");
const patients_srvc_1 = require("../services/patients.srvc");
const invoiceService = new invoice_srvc_1.InvoiceService(db_1.pool);
const visitsService = new visits_srvc_1.VisitsService(db_1.pool);
const patientsService = new patients_srvc_1.PatientsService(db_1.pool);
const getInvoices = async (req, res) => {
    const invoices = await invoiceService.findAll();
    res.status(200).json({
        data: { invoices }
    });
};
exports.getInvoices = getInvoices;
const getOneInvoice = async (req, res) => {
    const { id } = req.params;
    const response = await invoiceService.findOne(id);
    res.status(200).json({
        data: response
    });
};
exports.getOneInvoice = getOneInvoice;
const getDataForInvoice = async (req, res) => {
    const response = await Promise.all([
        invoiceService.newInvoiceData(),
        visitsService.findAllDocs(),
        patientsService.findAll(true)
    ]);
    res.status(200).json({
        data: {
            services: response[0][0],
            paymentMethods: response[0][1],
            doctors: response[1],
            patients: response[2]
        }
    });
};
exports.getDataForInvoice = getDataForInvoice;
const updateExistingInvoice = async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    const response = await invoiceService.updateInvoiceData(id, body);
    res.status(200).json({
        data: { id: response }
    });
};
exports.updateExistingInvoice = updateExistingInvoice;
const newInvoice = async (req, res) => {
    const invoiceFormData = req.body;
    const response = await invoiceService.createInvoice(invoiceFormData);
    res.status(201).json({
        data: {
            invoice: response
        }
    });
};
exports.newInvoice = newInvoice;
const deleteInvoice = async (req, res) => {
    const { id } = req.params;
    await invoiceService.softDeleteInvoice(id);
    res.status(200).json({
        msg: 'ok'
    });
};
exports.deleteInvoice = deleteInvoice;
