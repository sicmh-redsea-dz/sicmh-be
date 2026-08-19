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
        const nullable = (value: any) => value === '' || value === undefined ? null : value
    
        return {
            PacienteID,
            Diagnostico: nullable(Diagnostico),
            Tratamiento: nullable(Tratamiento),
            Notas: nullable(Notas),
            Presion: nullable(Presion),
            Oxigenacion: nullable(Oxigenacion),
            Temperatura: nullable(Temperatura),
            Glucometria: nullable(Glucometria),
            Peso: nullable(Peso),
            Altura: nullable(Altura),
            IMC: nullable(IMC),
            PorcentajeGrasa: nullable(PorcentajeGrasa),
            GrasaVisceral: nullable(GrasaVisceral),
            EdadSegunPeso: nullable(EdadSegunPeso),
            FechaVisita: date,
            FechaUltimaVisita: date,
            TipoVisita,
            FacturaID,
            PersonalID,
            Ant_Familiar: nullable(Ant_Familiar),
            Ant_Habito: nullable(Ant_Habito),
            Ant_Patologico: nullable(Ant_Patologico),
            Ant_Quirurgico: nullable(Ant_Quirurgico),
            MotivoConsulta: nullable(standard?.chiefComplaint),
            PadecimientoActual: nullable(standard?.currentIllness),
            ExploracionFisica: nullable(standard?.physicalExam),
            Alergias: nullable(standard?.allergies),
            MedicamentosActuales: nullable(standard?.currentMeds),
            PlanSeguimiento: nullable(module?.followUpPlan),
            ReferenciasInterconsultas: nullable(module?.referrals),

            NivelTriage: nullable(module?.triageLevel),
            ModoLlegada: nullable(module?.arrivalMode),
            EscalaDolor: nullable(module?.painScale),
            Glasgow: nullable(module?.glasgow),
            DestinoEmergencia: nullable(module?.disposition),
            MecanismoLesion: nullable(module?.injuryMechanism),

            DiagnosticoPreoperatorio: nullable(module?.preOpDiagnosis),
            DiagnosticoPostoperatorio: nullable(module?.postOpDiagnosis),
            ProcedimientoQuirurgico: nullable(module?.procedure),
            TipoAnestesia: nullable(module?.anesthesiaType),
            InicioCirugia: nullable(module?.surgeryStart),
            FinCirugia: nullable(module?.surgeryEnd),
            Hallazgos: nullable(module?.findings),
            Complicaciones: nullable(module?.complications),

            DiagnosticoIngreso: nullable(module?.admissionDiagnosis),
            MotivoIngreso: nullable(module?.admissionReason),
            ServicioHospitalizacion: nullable(module?.service),
            CamaHospitalizacion: nullable(module?.bed),
            ResumenEvolucion: nullable(module?.evolutionSummary),
            PlanEgreso: nullable(module?.dischargePlan),
            FechaEgreso: nullable(module?.dischargeDate)
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
            history.ReferenciasInterconsultas,
            history.NivelTriage,
            history.ModoLlegada,
            history.EscalaDolor,
            history.Glasgow,
            history.DestinoEmergencia,
            history.MecanismoLesion,
            history.DiagnosticoPreoperatorio,
            history.DiagnosticoPostoperatorio,
            history.ProcedimientoQuirurgico,
            history.TipoAnestesia,
            history.InicioCirugia,
            history.FinCirugia,
            history.Hallazgos,
            history.Complicaciones,
            history.DiagnosticoIngreso,
            history.MotivoIngreso,
            history.ServicioHospitalizacion,
            history.CamaHospitalizacion,
            history.ResumenEvolucion,
            history.PlanEgreso,
            history.FechaEgreso
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
                referrals: history.ReferenciasInterconsultas ?? fallback?.module.referrals ?? '',
                triageLevel: history.NivelTriage ?? fallback?.module.triageLevel ?? '',
                arrivalMode: history.ModoLlegada ?? fallback?.module.arrivalMode ?? '',
                painScale: history.EscalaDolor ?? fallback?.module.painScale,
                glasgow: history.Glasgow ?? fallback?.module.glasgow,
                disposition: history.DestinoEmergencia ?? fallback?.module.disposition ?? '',
                injuryMechanism: history.MecanismoLesion ?? fallback?.module.injuryMechanism ?? '',
                preOpDiagnosis: history.DiagnosticoPreoperatorio ?? fallback?.module.preOpDiagnosis ?? '',
                postOpDiagnosis: history.DiagnosticoPostoperatorio ?? fallback?.module.postOpDiagnosis ?? '',
                procedure: history.ProcedimientoQuirurgico ?? fallback?.module.procedure ?? '',
                anesthesiaType: history.TipoAnestesia ?? fallback?.module.anesthesiaType ?? '',
                surgeryStart: history.InicioCirugia ?? fallback?.module.surgeryStart ?? '',
                surgeryEnd: history.FinCirugia ?? fallback?.module.surgeryEnd ?? '',
                findings: history.Hallazgos ?? fallback?.module.findings ?? '',
                complications: history.Complicaciones ?? fallback?.module.complications ?? '',
                admissionDiagnosis: history.DiagnosticoIngreso ?? fallback?.module.admissionDiagnosis ?? '',
                admissionReason: history.MotivoIngreso ?? fallback?.module.admissionReason ?? '',
                service: history.ServicioHospitalizacion ?? fallback?.module.service ?? '',
                bed: history.CamaHospitalizacion ?? fallback?.module.bed ?? '',
                evolutionSummary: history.ResumenEvolucion ?? fallback?.module.evolutionSummary ?? '',
                dischargePlan: history.PlanEgreso ?? fallback?.module.dischargePlan ?? '',
                dischargeDate: history.FechaEgreso ?? fallback?.module.dischargeDate ?? ''
            }
        }
    }
}
