import { Patient } from "../entities/Patient";
import { PatientResponse } from "../responses/PatientResponse";

export class PatientMapper {
    static toPatientsResponse = (patient:Patient): PatientResponse => {
        const {
            PacienteID: id,
            Nombre: name,
            Apellido: lastName,
            FechaNacimiento: birthDate,
            Telefono: phone,
            CorreoElectronico: email,
            Direccion: address,
            Identificacion: idNumber,
            Genero: gender
        } = patient

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
        }
    }
}