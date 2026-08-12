import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { PatientMapper } from '../domain/mappers/PatientMapper'
import { patientQueries } from '../infrastructure/database/queries/patients.queries'

describe('patient emergency contact', () => {
  test('reads the active primary emergency contact for a patient', () => {
    const query = patientQueries('read-one')

    assert.match(query, /left join contacto_emergencia/i)
    assert.match(query, /ce2\.PacienteID\s*=\s*p\.PacienteID/i)
    assert.match(query, /ce2\.IsActive\s*=\s*1/i)
    assert.match(query, /order by ce2\.IsPrimary desc/i)
    assert.match(query, /where p\.PacienteID\s*=\s*\?/i)
  })

  test('maps emergency contact columns into the patient response', () => {
    const response = PatientMapper.toPatientsResponse({
      PacienteID: 7,
      Nombre: 'Ana',
      Apellido: 'López',
      FechaNacimiento: new Date('1990-01-01'),
      Telefono: '99999999',
      CorreoElectronico: 'ana@example.com',
      Direccion: 'Tegucigalpa',
      Identificacion: '0801199000001',
      TipoIdentificacion: 'identidad',
      Genero: 'female',
      total_registries: 1,
      EmergencyContactID: 3,
      EmergencyContactName: 'Luis López',
      EmergencyContactRelationship: 'Hermano',
      EmergencyContactPhone: '88888888',
      EmergencyContactEmail: null,
      EmergencyContactAddress: null
    })

    assert.deepEqual(response.emergencyContact, {
      id: 3,
      name: 'Luis López',
      relationship: 'Hermano',
      phone: '88888888',
      email: '',
      address: ''
    })
    assert.equal(response.identificationType, 'identidad')
  })
})
