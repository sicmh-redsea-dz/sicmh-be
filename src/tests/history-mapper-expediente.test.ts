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
        referrals: 'Gastroenterologia'
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

  assert.deepEqual(result, {
    standard: {
      chiefComplaint: 'Valor SQL',
      currentIllness: 'Evolucion SQL',
      physicalExam: 'Exploracion SQL',
      allergies: 'Alergia JSON',
      currentMeds: 'Medicamento JSON'
    },
    module: {
      followUpPlan: 'Seguimiento SQL',
      referrals: 'Referencia JSON',
      triageLevel: 'Rojo'
    }
  })
})
