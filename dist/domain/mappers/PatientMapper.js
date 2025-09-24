"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientMapper = void 0;
class PatientMapper {
}
exports.PatientMapper = PatientMapper;
PatientMapper.toPatientsResponse = (patient) => {
    const { PacienteID: id, Nombre: name, Apellido: lastName, FechaNacimiento: birthDate, Telefono: phone, CorreoElectronico: email, Direccion: address, Identificacion: idNumber, Genero: gender } = patient;
    return {
        id,
        name,
        lastName,
        birthDate,
        phone,
        email,
        address,
        idNumber,
        gender
    };
};
PatientMapper.toShortPatientsResponse = (patient) => {
    const { PacienteID: id, NombrePersonal: name, } = patient;
    return {
        id,
        name,
    };
};
