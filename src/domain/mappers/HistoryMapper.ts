import { ShortHistory, History } from "../entities/History"
import { ExpedientePayload } from "../entities/Expediente"
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
            Estado: state,
            TipoVisita: visitType
        } = history

        return {
            id,
            doctorName,
            patientId,
            patientName,
            lastVisitDate,
            invoiceNumber,
            state,
            diagnosis,
            visitType
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
            NombreDoctor: docName,
            InventarioUsado
        } = history
        

        const usedInventory = InventarioUsado
            .filter( x => x.InventarioID )
            .map( x => ({ stockId:x.InventarioID, stockQty: x.CantidadUsada }))

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
            docName,
            usedInventory
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
            fatPercentage: PorcentajeGrasa,
            visceralFat: GrasaVisceral,
            ageAccordingToWeight: EdadSegunPeso,
            date,
            visitType: TipoVisita,
            invoiceId: FacturaID,
            doctor: PersonalID,

            familyHst: Ant_Familiar,
            backgroundHst: Ant_Habito,
            pathologicalHst: Ant_Patologico,
            surgicalHst: Ant_Quirurgico,
        } = newHistory

        const standard = newHistory.expediente?.standard
        const module = newHistory.expediente?.module
    
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
            Ant_Quirurgico,
            MotivoConsulta: standard?.chiefComplaint,
            PadecimientoActual: standard?.currentIllness,
            ExploracionFisica: standard?.physicalExam,
            Alergias: standard?.allergies,
            MedicamentosActuales: standard?.currentMeds,
            PlanSeguimiento: module?.followUpPlan,
            ReferenciasInterconsultas: module?.referrals
        }
    }

    static toExpedientePayload = (
        history: History,
        fallback: ExpedientePayload | null = null
    ): ExpedientePayload | null => {
        const sqlValues = [
            history.MotivoConsulta,
            history.PadecimientoActual,
            history.ExploracionFisica,
            history.Alergias,
            history.MedicamentosActuales,
            history.PlanSeguimiento,
            history.ReferenciasInterconsultas
        ]
        const hasSqlData = sqlValues.some((value) => value !== undefined && value !== null)

        if (!hasSqlData && !fallback) return null

        return {
            standard: {
                chiefComplaint: history.MotivoConsulta ?? fallback?.standard.chiefComplaint ?? '',
                currentIllness: history.PadecimientoActual ?? fallback?.standard.currentIllness ?? '',
                physicalExam: history.ExploracionFisica ?? fallback?.standard.physicalExam ?? '',
                allergies: history.Alergias ?? fallback?.standard.allergies ?? '',
                currentMeds: history.MedicamentosActuales ?? fallback?.standard.currentMeds ?? ''
            },
            module: {
                ...(fallback?.module ?? {}),
                followUpPlan: history.PlanSeguimiento ?? fallback?.module.followUpPlan ?? '',
                referrals: history.ReferenciasInterconsultas ?? fallback?.module.referrals ?? ''
            }
        }
    }
}
