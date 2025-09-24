"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitsService = void 0;
const queries_1 = require("../helper/visits/queries");
var queryKeys;
(function (queryKeys) {
    queryKeys["Update"] = "update";
    queryKeys["Create"] = "create-simple-visit";
    queryKeys["CreateER"] = "create-er-visit";
    queryKeys["AllDocs"] = "all-docs";
    queryKeys["OneVisit"] = "getOneVisit";
    queryKeys["AllVisits"] = "all-visits";
    queryKeys["TotalReg"] = "total-registries";
    queryKeys["SoftDelete"] = "delete";
})(queryKeys || (queryKeys = {}));
class VisitsService {
    constructor(pool) {
        this.pool = pool;
    }
    async findAll(pagination) {
        const { limit, offset } = pagination;
        const query = (0, queries_1.queries)(queryKeys.AllVisits, limit, offset);
        try {
            const [response] = await this.pool.execute(query);
            const formmattedData = this.formatDataResponse(response);
            const totalRegistries = await this.totalRegistries();
            return [formmattedData, totalRegistries];
        }
        catch (err) {
            throw new Error(err);
        }
    }
    async findOneVisit(id) {
        const query = (0, queries_1.queries)(queryKeys.OneVisit);
        const value = [parseInt(id)];
        try {
            const [response] = await this.pool.execute(query, value);
            const formatData = this.formatLongResponse(response);
            return formatData;
        }
        catch (err) {
            throw new Error(err);
        }
    }
    async saveNewVisit(visitForm, origin) {
        const values = origin === 'sp' ? this.convertVisitFormForSp(visitForm) : this.convertVisitFormForEr(visitForm);
        const query = origin === 'sp' ? (0, queries_1.queries)(queryKeys.Create) : (0, queries_1.queries)(queryKeys.CreateER);
        try {
            const [response] = await this.pool.execute(query, values);
            const { insertId } = response;
            return insertId;
        }
        catch (err) {
            throw new Error(err);
        }
    }
    async editVisit(id, visitForm) {
        const queryToUpdate = (0, queries_1.queries)(queryKeys.Update);
        const queryToRead = (0, queries_1.queries)(queryKeys.OneVisit);
        const values = [...this.convertVisitFormForSp(visitForm), id];
        try {
            await this.pool.execute(queryToUpdate, values);
            const [response] = await this.pool.execute(queryToRead, [parseInt(id)]);
            const formattedData = this.formatDataResponse(response);
            return formattedData[0].id;
        }
        catch (err) {
            throw new Error(err);
        }
    }
    async softDeletePatient(id) {
        const query = (0, queries_1.queries)(queryKeys.SoftDelete);
        const values = [0, id];
        try {
            await this.pool.execute(query, values);
            return true;
        }
        catch (err) {
            throw new Error(err);
        }
    }
    async findAllDocs() {
        const query = (0, queries_1.queries)(queryKeys.AllDocs);
        try {
            const [response] = await this.pool.execute(query);
            return response.map((doctor) => {
                const { DoctorID, NombreDoctor } = doctor;
                return { id: DoctorID, name: NombreDoctor };
            });
        }
        catch (err) {
            throw new Error(err);
        }
    }
    async totalRegistries() {
        const query = (0, queries_1.queries)(queryKeys.TotalReg);
        try {
            const [response] = await this.pool.execute(query);
            const [totalRegistries] = response;
            return totalRegistries['total_registries'];
        }
        catch (err) {
            throw new Error(err);
        }
    }
    convertVisitFormForSp(data) {
        const { patient, doctor, date, diagnosis, treatment, notes, pressure, oxygenation, temperature, glucometry, weight, height, BMI, fatPercentage, visceralFat, ageAccordingToWeight } = data;
        const values = [patient, doctor, date, diagnosis, treatment, notes, pressure, oxygenation, temperature, glucometry, weight, parseFloat(height) / 100, parseFloat(BMI), parseFloat(fatPercentage), parseFloat(visceralFat), parseInt(ageAccordingToWeight), date, true];
        return values;
    }
    convertVisitFormForEr(data) {
        const { patient, doctor, date, notes, pressure, oxygenation, temperature, glucometry, weight, height } = data;
        const values = [patient, doctor, date, notes, pressure, oxygenation, temperature, glucometry, weight, parseFloat(height) / 100, date, true];
        return values;
    }
    formatDataResponse(data) {
        return data.map((visit) => {
            const { HistoriaID: id, NombreDoctor: doctorName, NombrePaciente: patientName, FechaUltimaVisita: lastVisitDate, Diagnostico: diagnosis } = visit;
            return { id, doctorName, patientName, lastVisitDate, diagnosis };
        });
    }
    formatLongResponse(data) {
        const visit = data[0];
        const { HistoriaID: id, PacienteID: patient, DoctorID: doctor, FechaVisita: date, Diagnostico: diagnosis, Tratamiento: treatment, Notas: notes, Presion: pressure, Oxigenacion: oxygenation, Temperatura: temperature, Glucometria: glucometry, Peso: weight, Altura: height, IMC: BMI, PorcentajeGrasa: fatPercentage, GrasaVisceral: visceralFat, EdadSegunPeso: ageAccordingToWeight } = visit;
        return {
            id, BMI, date, notes, height, weight, doctor, patient, pressure, diagnosis, treatment,
            glucometry, temperature, oxygenation, visceralFat, fatPercentage, ageAccordingToWeight
        };
    }
}
exports.VisitsService = VisitsService;
