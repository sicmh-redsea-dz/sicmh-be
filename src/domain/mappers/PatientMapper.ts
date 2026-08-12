import { Patient, ShortPatient } from "../entities/Patient";
import { PatientResponse, ShortPatientResponse } from "../responses/PatientResponse";

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
            Genero: gender,
            EmergencyContactID: emergencyContactId,
            EmergencyContactName: emergencyContactName,
            EmergencyContactRelationship: emergencyContactRelationship,
            EmergencyContactPhone: emergencyContactPhone,
            EmergencyContactEmail: emergencyContactEmail,
            EmergencyContactAddress: emergencyContactAddress
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
            gender,
            emergencyContact: emergencyContactId ? {
                id: emergencyContactId,
                name: emergencyContactName ?? '',
                relationship: emergencyContactRelationship ?? '',
                phone: emergencyContactPhone ?? '',
                email: emergencyContactEmail ?? '',
                address: emergencyContactAddress ?? ''
            } : null
        }
    }

    static toShortPatientsResponse = (patient:ShortPatient): ShortPatientResponse => {
        const {
            PacienteID: id,
            NombrePersonal: name,
        } = patient

        return {
            id,
            name,
        }
    }
}
