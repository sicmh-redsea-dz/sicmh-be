import assert from 'node:assert/strict'
import test from 'node:test'

import { HistoryMapper } from '../domain/mappers/HistoryMapper'
import { History } from '../domain/entities/History'

test('maps the clinical history and follow-up sections to SQL columns', () => {
  const mapped = HistoryMapper.toDbForm({
    expediente: {
      standard: {
        chiefComplaint: 'Dolor abdominal',
        currentIllness: 'Tres dias de evolucion',
        physicalExam: 'Dolor a la palpacion',
        allergies: 'Penicilina',
        currentMeds: 'Losartan'
      },
      module: {
        followUpPlan: 'Control en siete dias',
        referrals: 'Gastroenterologia',
        triageLevel: 'Rojo',
        arrivalMode: 'Ambulancia',
        painScale: 8,
        glasgow: 14,
        disposition: 'Ingreso',
        injuryMechanism: 'Caida',
        preOpDiagnosis: 'Apendicitis',
        postOpDiagnosis: 'Apendicitis aguda',
        procedure: 'Apendicectomia',
        anesthesiaType: 'General',
        surgeryStart: '08:30',
        surgeryEnd: '10:15',
        findings: 'Sin hallazgos adicionales',
        complications: 'Ninguna',
        admissionDiagnosis: 'Neumonia',
        admissionReason: 'Observacion',
        service: 'Medicina interna',
        bed: 'H-12',
        evolutionSummary: 'Evolucion favorable',
        dischargePlan: 'Control ambulatorio',
        dischargeDate: '2026-08-20'
      }
    }
  })

  assert.equal(mapped.MotivoConsulta, 'Dolor abdominal')
  assert.equal(mapped.PadecimientoActual, 'Tres dias de evolucion')
  assert.equal(mapped.ExploracionFisica, 'Dolor a la palpacion')
  assert.equal(mapped.Alergias, 'Penicilina')
  assert.equal(mapped.MedicamentosActuales, 'Losartan')
  assert.equal(mapped.PlanSeguimiento, 'Control en siete dias')
  assert.equal(mapped.ReferenciasInterconsultas, 'Gastroenterologia')
  assert.equal(mapped.NivelTriage, 'Rojo')
  assert.equal(mapped.ModoLlegada, 'Ambulancia')
  assert.equal(mapped.EscalaDolor, 8)
  assert.equal(mapped.Glasgow, 14)
  assert.equal(mapped.DestinoEmergencia, 'Ingreso')
  assert.equal(mapped.MecanismoLesion, 'Caida')
  assert.equal(mapped.DiagnosticoPreoperatorio, 'Apendicitis')
  assert.equal(mapped.DiagnosticoPostoperatorio, 'Apendicitis aguda')
  assert.equal(mapped.ProcedimientoQuirurgico, 'Apendicectomia')
  assert.equal(mapped.TipoAnestesia, 'General')
  assert.equal(mapped.InicioCirugia, '08:30')
  assert.equal(mapped.FinCirugia, '10:15')
  assert.equal(mapped.Hallazgos, 'Sin hallazgos adicionales')
  assert.equal(mapped.Complicaciones, 'Ninguna')
  assert.equal(mapped.DiagnosticoIngreso, 'Neumonia')
  assert.equal(mapped.MotivoIngreso, 'Observacion')
  assert.equal(mapped.ServicioHospitalizacion, 'Medicina interna')
  assert.equal(mapped.CamaHospitalizacion, 'H-12')
  assert.equal(mapped.ResumenEvolucion, 'Evolucion favorable')
  assert.equal(mapped.PlanEgreso, 'Control ambulatorio')
  assert.equal(mapped.FechaEgreso, '2026-08-20')
})

test('hydrates expediente from SQL while retaining legacy JSON module fields', () => {
  const history = {
    MotivoConsulta: 'Valor SQL',
    PadecimientoActual: 'Evolucion SQL',
    ExploracionFisica: 'Exploracion SQL',
    Alergias: null,
    MedicamentosActuales: null,
    PlanSeguimiento: 'Seguimiento SQL',
    ReferenciasInterconsultas: null
  } as History

  const result = HistoryMapper.toExpedientePayload(history, {
    standard: {
      chiefComplaint: 'Valor JSON anterior',
      currentIllness: 'Evolucion JSON',
      physicalExam: 'Exploracion JSON',
      allergies: 'Alergia JSON',
      currentMeds: 'Medicamento JSON'
    },
    module: {
      followUpPlan: 'Seguimiento JSON',
      referrals: 'Referencia JSON',
      triageLevel: 'Rojo'
    }
  })

  assert.equal(result?.standard.chiefComplaint, 'Valor SQL')
  assert.equal(result?.standard.currentIllness, 'Evolucion SQL')
  assert.equal(result?.standard.physicalExam, 'Exploracion SQL')
  assert.equal(result?.standard.allergies, 'Alergia JSON')
  assert.equal(result?.standard.currentMeds, 'Medicamento JSON')
  assert.equal(result?.module.followUpPlan, 'Seguimiento SQL')
  assert.equal(result?.module.referrals, 'Referencia JSON')
  assert.equal(result?.module.triageLevel, 'Rojo')
})

test('hydrates each specialized visit block from SQL', () => {
  const history = {
    NivelTriage: 'Amarillo',
    ModoLlegada: 'Traslado',
    EscalaDolor: 6,
    Glasgow: 13,
    DestinoEmergencia: 'Ingreso',
    MecanismoLesion: 'Accidente vial',
    DiagnosticoPreoperatorio: 'Fractura',
    DiagnosticoPostoperatorio: 'Fractura reducida',
    ProcedimientoQuirurgico: 'Reduccion abierta',
    TipoAnestesia: 'Regional',
    InicioCirugia: '09:00:00',
    FinCirugia: '11:00:00',
    Hallazgos: 'Sin lesion vascular',
    Complicaciones: 'Ninguna',
    DiagnosticoIngreso: 'Posoperatorio',
    MotivoIngreso: 'Vigilancia',
    ServicioHospitalizacion: 'Ortopedia',
    CamaHospitalizacion: 'H-04',
    ResumenEvolucion: 'Estable',
    PlanEgreso: 'Curaciones diarias',
    FechaEgreso: '2026-08-21'
  } as History

  const result = HistoryMapper.toExpedientePayload(history)

  assert.equal(result?.module.triageLevel, 'Amarillo')
  assert.equal(result?.module.arrivalMode, 'Traslado')
  assert.equal(result?.module.painScale, 6)
  assert.equal(result?.module.glasgow, 13)
  assert.equal(result?.module.disposition, 'Ingreso')
  assert.equal(result?.module.injuryMechanism, 'Accidente vial')
  assert.equal(result?.module.preOpDiagnosis, 'Fractura')
  assert.equal(result?.module.postOpDiagnosis, 'Fractura reducida')
  assert.equal(result?.module.procedure, 'Reduccion abierta')
  assert.equal(result?.module.anesthesiaType, 'Regional')
  assert.equal(result?.module.surgeryStart, '09:00:00')
  assert.equal(result?.module.surgeryEnd, '11:00:00')
  assert.equal(result?.module.findings, 'Sin lesion vascular')
  assert.equal(result?.module.complications, 'Ninguna')
  assert.equal(result?.module.admissionDiagnosis, 'Posoperatorio')
  assert.equal(result?.module.admissionReason, 'Vigilancia')
  assert.equal(result?.module.service, 'Ortopedia')
  assert.equal(result?.module.bed, 'H-04')
  assert.equal(result?.module.evolutionSummary, 'Estable')
  assert.equal(result?.module.dischargePlan, 'Curaciones diarias')
  assert.equal(result?.module.dischargeDate, '2026-08-21')
})
