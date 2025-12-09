"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientsController = void 0;
const service_container_1 = require("../../domain/services/container/service.container");
class PatientsController {
    constructor() {
        this.getPatients = async (req, res, next) => {
            const limit = Number(req.query.limit) || 25;
            const offset = Number(req.query.offset) || 0;
            const term = String(req.query.term) || '';
            try {
                const { patients, totalRegistries } = await this.patientsService.findAllPatients({ limit, offset, term });
                res.status(202).json({
                    data: {
                        patients,
                        totalRegistries
                    }
                });
            }
            catch (err) {
                next(err);
            }
        };
        this.getPatient = async (req, res, next) => {
            const { id } = req.params;
            try {
                const patient = await this.patientsService.findOnePatient(+id);
                res.status(200).json({
                    data: { patient }
                });
            }
            catch (err) {
                next(err);
            }
        };
        this.insertPatient = async (req, res, next) => {
            const body = req.body;
            try {
                const insertedPatient = await this.patientsService.insertPatient(body);
                res.status(201).json({
                    data: { patient: insertedPatient }
                });
            }
            catch (err) {
                next(err);
            }
        };
        this.updatePatient = async (req, res, next) => {
            const { id } = req.params;
            const body = req.body;
            try {
                const updatedPatient = await this.patientsService.updatedPatient(body, Number(id));
                res.status(200).json({
                    data: {
                        patient: updatedPatient
                    }
                });
            }
            catch (err) {
                next(err);
            }
        };
        this.deletePatient = async (req, res, next) => {
            const { id } = req.params;
            try {
                const [isPatientDeleted, patientId] = await this.patientsService.softDeletePatient(Number(id));
                res.status(200).json({
                    data: {
                        msg: 'ok',
                        status: isPatientDeleted && 'deleted',
                        patientId
                    }
                });
            }
            catch (err) {
                next(err);
            }
        };
        this.patientsService = service_container_1.ServiceContainer.getPatientsService();
    }
}
exports.PatientsController = PatientsController;
