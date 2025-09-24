"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientsService = void 0;
const queries_1 = require("../helper/patients/queries");
var queryKeys;
(function (queryKeys) {
    queryKeys["Read"] = "read";
    queryKeys["ReadOne"] = "readOne";
    queryKeys["Create"] = "create";
    queryKeys["Update"] = "update";
    queryKeys["TotalReg"] = "total-registries";
    queryKeys["SoftDelete"] = "delete";
})(queryKeys || (queryKeys = {}));
class PatientsService {
    constructor(pool) {
        this.pool = pool;
    }
    async findAll(shortenedAns, pagination) {
        const { limit = 25, offset = 0 } = pagination || {};
        let query = (0, queries_1.queries)(queryKeys.Read, limit, offset);
        if (shortenedAns) {
            query = query.replace(/limit\s*\d+\s*offset\s*\d+/i, '');
        }
        try {
            const [response] = await this.pool.execute(query, shortenedAns ? [] : [limit, offset]);
            const formattedResp = this.formatDataForResp(response);
            const totalRegistries = await this.totalRegistries();
            return shortenedAns ? this.shortAnsFormatter(formattedResp) : [formattedResp, totalRegistries];
        }
        catch (err) {
            throw new Error(err);
        }
    }
    async findOne(patientId) {
        try {
            const patient = await this.getUserData(patientId);
            const formattedData = this.formatDataForResp(patient);
            return formattedData[0];
        }
        catch (err) {
            throw new Error(err);
        }
    }
    async saveNewPatient(patient) {
        const { firstName, lastName, birthdate, phone, email, address, gender, idNumber } = patient;
        const values = [firstName, lastName, birthdate, phone, email, address, idNumber, gender];
        const query = (0, queries_1.queries)(queryKeys.Create);
        try {
            const [response] = await this.pool.execute(query, values);
            const { insertId } = response;
            const newPatient = await this.getUserData(insertId);
            const formattedData = this.formatDataForResp(newPatient);
            return formattedData[0];
        }
        catch (err) {
            console.error('Error exec query: ', err.message);
            if (err.errno === 1062)
                throw new Error('Duplicate entry');
            else
                throw new Error('Error creating new Patient');
        }
    }
    async updatePatient(id, patient) {
        const query = (0, queries_1.queries)(queryKeys.Update);
        const { firstName, lastName, birthdate, phone, email, address, gender } = patient;
        const values = [firstName, lastName, birthdate, phone, email, address, gender, id];
        try {
            await this.pool.execute(query, values);
            const updatedPatient = await this.getUserData(id);
            const formattedData = this.formatDataForResp(updatedPatient);
            return formattedData[0];
        }
        catch (err) {
            console.error('Error exec query: ', err.message);
            throw new Error('Error editing Patient');
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
    shortAnsFormatter(data) {
        return data.map((patient) => {
            const { id, name, lastName } = patient;
            return { id, name: `${name} ${lastName}` };
        });
    }
    formatDataForResp(data) {
        const isPatientRow = Array.isArray(data);
        const dataToFormat = isPatientRow ? data : [data];
        const formattedData = dataToFormat.map((patient) => {
            const { PacienteID: id, Nombre: name, Apellido: lastName, FechaNacimiento: birthDate, Telefono: phone, CorreoElectronico: email, Direccion: address, Genero: gender, Identificacion: idNumber } = patient;
            return { id, name, lastName, birthDate, phone, email, address, gender, idNumber };
        });
        return formattedData;
    }
    async getUserData(val) {
        const query = (0, queries_1.queries)(queryKeys.ReadOne);
        const [response] = await this.pool.execute(query, [val]);
        let [user] = response;
        return user;
    }
}
exports.PatientsService = PatientsService;
