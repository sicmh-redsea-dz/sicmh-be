"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceContainer = void 0;
const patients_service_1 = require("../patients.service");
const visits_service_1 = require("../visits.service");
const stock_services_1 = require("../stock.services");
const staff_service_1 = require("../staff.service");
const dashboard_service_1 = require("../dashboard.service");
const invoice_service_1 = require("../invoice.service");
const inv_service_1 = require("../inv.service");
class ServiceContainer {
    static getVisitsService() {
        if (!this.visitsService)
            this.visitsService = new visits_service_1.VisitsService(this.getStaffService(), this.getPatientsService(), this.getStockService(), this.getInvoiceService());
        return this.visitsService;
    }
    static getStockService() {
        if (!this.stockService)
            this.stockService = new stock_services_1.StockService();
        return this.stockService;
    }
    static getStaffService() {
        if (!this.staffService)
            this.staffService = new staff_service_1.StaffService();
        return this.staffService;
    }
    static getPatientsService() {
        if (!this.patientsService)
            this.patientsService = new patients_service_1.PatientsService();
        return this.patientsService;
    }
    static getDashbService() {
        if (!this.dashbService)
            this.dashbService = new dashboard_service_1.DashbService();
        return this.dashbService;
    }
    static getInvoiceService() {
        if (!this.invoiceService) {
            this.invoiceService = new invoice_service_1.InvoiceService(this.getPatientsService());
        }
        return this.invoiceService;
    }
    static getInvService() {
        if (!this.invService) {
            this.invService = new inv_service_1.InvService();
        }
        return this.invService;
    }
}
exports.ServiceContainer = ServiceContainer;
