"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.softDeletePacient = exports.patchPacient = exports.postPatients = exports.getPatient = exports.getPatients = void 0;
const patients_srvc_1 = require("../services/patients.srvc");
const db_1 = require("../config/db");
const patientService = new patients_srvc_1.PatientsService(db_1.pool);
const getPatients = async (req, res) => {
    const limit = parseInt((req.query.limit || '25').toString());
    const offset = parseInt((req.query.offset || '0').toString());
    if (isNaN(limit) || limit <= 0 || isNaN(offset) || offset < 0) {
        res.status(400).json({
            error: 'Invalid pagination parameters. "limit" must be a positive integer and "offset" must be a non-negative integer.'
        });
        return;
    }
    const pagination = { limit, offset };
    const [patients, totalRegistries] = await patientService.findAll(false, pagination);
    res.status(200).json({
        data: {
            patients,
            totalCount: Array.isArray(patients) ? patients.length : 0,
            totalRegistries
        }
    });
};
exports.getPatients = getPatients;
const getPatient = async (req, res) => {
    const { id } = req.params;
    const patient = await patientService.findOne(id);
    res.status(200).json({
        data: { patient }
    });
};
exports.getPatient = getPatient;
const postPatients = async (req, res) => {
    const newPatient = req.body;
    const patient = await patientService.saveNewPatient(newPatient);
    res.status(201).json({
        data: { patient }
    });
};
exports.postPatients = postPatients;
const patchPacient = async (req, res) => {
    const { id } = req.params;
    const patientData = req.body;
    const patient = await patientService.updatePatient(id, patientData);
    res.status(200).json({
        data: { patient }
    });
};
exports.patchPacient = patchPacient;
const softDeletePacient = async (req, res) => {
    const { id } = req.params;
    await patientService.softDeletePatient(parseInt(id));
    res.status(200).json({
        data: {
            msg: 'ok'
        }
    });
};
exports.softDeletePacient = softDeletePacient;
