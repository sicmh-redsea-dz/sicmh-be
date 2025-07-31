import { ShortHistory, History } from "../entities/History"
import { HistoryResponse, ShortHistoryResponse } from "../responses/VisitsReponse"

export class HistoryMapper {
    static toHistoryResponse = (history: ShortHistory): ShortHistoryResponse => {
        const {
            HistoriaID: id,
            NombreDoctor: doctorName,
            NombrePaciente: patientName,
            IdPaciente: patientId,
            FechaUltimaVisita: lastVisitDate,
            Diagnostico: diagnosis,
            InvoiceNumber: invoiceNumber,
            Estado: state
        } = history

        return {
            id,
            doctorName,
            patientId,
            patientName,
            lastVisitDate,
            invoiceNumber,
            state,
            diagnosis
        }
    }

    static toHistoryFormResponse = (history: History): HistoryResponse => {
        const {
            HistoriaID: id,
            PacienteID: patientId,
            FechaVisita: visitDate,
            Diagnostico: diagnosis,
            Tratamiento: treatment,
            Notas: notes,
            Presion: bloodPressure,
            Oxigenacion: oxygenSaturation,
            Temperatura: temperature,
            Glucometria: glucoseLevel,
            Peso: weight,
            Altura: height,
            IMC: BMI,
            PorcentajeGrasa: bodyFatPercentage,
            GrasaVisceral: visceralFat,
            EdadSegunPeso: ageBasedOnWeight,
            FechaUltimaVisita: lastVisitDate,
            TipoVisita: visitType,
            FacturaID: invoiceId,
            PersonalID: staffId,
            Ant_Familiar: familyHst, 
            Ant_Habito: backgroundHst, 
            Ant_Patologico: pathologicalHst, 
            Ant_Quirurgico: surgicalHst, 
            NombrePaciente: patientName,
            NombreDoctor: docName
        } = history

        return {
            id,
            patientId,
            visitDate,
            diagnosis,
            treatment,
            notes,
            bloodPressure,
            oxygenSaturation,
            temperature,
            glucoseLevel,
            weight,
            height,
            BMI,
            bodyFatPercentage,
            visceralFat,
            ageBasedOnWeight,
            lastVisitDate,
            visitType,
            invoiceId,
            staffId,
            familyHst,
            backgroundHst,
            pathologicalHst,
            surgicalHst,
            patientName,
            docName
        }
    }
    
    static toDbForm = ( newHistory: any ) => {
        const {
            patient: PacienteID,
            diagnosis: Diagnostico,
            treatment: Tratamiento,
            notes: Notas,
            pressure: Presion,
            oxygenation: Oxigenacion,
            temperature: Temperatura,
            glucometry: Glucometria,
            weight: Peso,
            height: Altura,
            BMI: IMC,
            bodyFatPercentage: PorcentajeGrasa,
            visceralFat: GrasaVisceral,
            ageBasedOnWeight: EdadSegunPeso,
            date,
            visitType: TipoVisita,
            invoiceId: FacturaID,
            doctor: PersonalID,

            familyHst: Ant_Familiar,
            backgroundHst: Ant_Habito,
            pathologicalHst: Ant_Patologico,
            surgicalHst: Ant_Quirurgico,
        } = newHistory
    
        return {
            PacienteID,
            Diagnostico,
            Tratamiento,
            Notas,
            Presion,
            Oxigenacion,
            Temperatura,
            Glucometria,
            Peso,
            Altura,
            IMC,
            PorcentajeGrasa,
            GrasaVisceral,
            EdadSegunPeso,
            FechaVisita: date,
            FechaUltimaVisita: date,
            TipoVisita,
            FacturaID,
            PersonalID,
            Ant_Familiar,
            Ant_Habito,
            Ant_Patologico,
            Ant_Quirurgico
        }
    }
}