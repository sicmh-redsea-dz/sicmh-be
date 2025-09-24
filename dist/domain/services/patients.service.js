"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientsService = void 0;
const Database_1 = require("../../infrastructure/database/Database");
const patients_queries_1 = require("../../infrastructure/database/queries/patients.queries");
const PatientMapper_1 = require("../mappers/PatientMapper");
class PatientsService {
    constructor() {
        this.findAllPatients = async (args) => {
            let patientsQ = (0, patients_queries_1.patientQueries)('read', args);
            try {
                const patients = await Database_1.Database.execute(patientsQ);
                const totalRegistries = patients[0].total_registries;
                const mappedPatients = patients.map(patient => PatientMapper_1.PatientMapper.toPatientsResponse(patient));
                return {
                    patients: mappedPatients,
                    totalRegistries
                };
            }
            catch (err) {
                throw err;
            }
        };
        this.findOnePatient = async (patientId) => {
            const patientQ = (0, patients_queries_1.patientQueries)('read-one');
            const patientV = [patientId];
            try {
                const patient = await Database_1.Database.execute(patientQ, patientV);
                if (!patient || patient.length === 0)
                    throw this.errorHandler('not_found_error', `Patient with Id ${patientId} not found`);
                return PatientMapper_1.PatientMapper.toPatientsResponse(patient[0]);
            }
            catch (err) {
                throw err;
            }
        };
        this.insertPatient = async (patientParams) => {
            console.log('patient params :::: ', patientParams);
            const { birthdate, firstName, lastName, address, gender, phone, email, id } = patientParams;
            const patientQ = (0, patients_queries_1.patientQueries)('create');
            const patientV = [firstName, lastName, birthdate, phone, email, address, id, gender];
            try {
                const newPatient = await Database_1.Database.execute(patientQ, patientV);
                const { insertId } = newPatient;
                console.log('insert id ::::: ', insertId);
                return this.findOnePatient(insertId);
            }
            catch (err) {
                let error = new Error();
                console.log('da error :::: ', error);
                if (err.code === 'ER_DUP_ENTRY') {
                    error.name = 'duplicate_entry';
                    error.message = `Duplicated entry ${email}`;
                    throw error;
                }
                else {
                    throw err;
                }
            }
        };
        this.updatedPatient = async (patientParams, id) => {
            const { firstName, lastName, phone, email, address, gender, birthdate } = patientParams;
            const patientQ = (0, patients_queries_1.patientQueries)('update');
            const patientV = [firstName, lastName, birthdate, phone, email, address, gender, id];
            try {
                const updatedPatient = await Database_1.Database.execute(patientQ, patientV);
                const { affectedRows } = updatedPatient;
                if (affectedRows === 0)
                    throw this.errorHandler('not_found_error', `No patient found with Id: ${id}, to update`);
                return await this.findOnePatient(id);
            }
            catch (err) {
                throw err;
            }
        };
        this.softDeletePatient = async (id) => {
            const patientQ = (0, patients_queries_1.patientQueries)('soft-delete');
            const patientV = [0, id];
            try {
                const deletedPatient = await Database_1.Database.execute(patientQ, patientV);
                const { affectedRows } = deletedPatient;
                if (affectedRows === 0)
                    throw this.errorHandler('not_found_error', `No patient found with Id: ${id}, to delete`);
                return [true, id];
            }
            catch (err) {
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
}
exports.PatientsService = PatientsService;
