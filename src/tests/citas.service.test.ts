import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { CitasRepository, CreateCitaParams } from '../application/ports/citas.repository'
import { CitasService } from '../application/services/citas.service'
import { Cita } from '../domain/entities/Cita'

const createRepository = (sources: string[]) => {
  let created: CreateCitaParams | null = null

  const repo: CitasRepository = {
    list: async () => [],
    listUpcoming: async () => [],
    findById: async id => ({
      CitaID: id,
      Titulo: created?.titulo ?? 'Consulta',
      Inicio: created?.inicio ?? '2026-08-27 09:00:00',
      Fin: created?.fin ?? '2026-08-27 10:00:00',
      Tipo: created?.tipo ?? 'consulta',
      Estado: created?.estado ?? 'pendiente',
      Source: created?.source ?? sources[0] ?? '',
    } satisfies Cita),
    create: async params => {
      created = params
      return 1
    },
    update: async () => {},
    delete: async () => {},
    listDoctors: async () => [],
    listSources: async () => sources,
    checkDoctorConflict: async () => false,
    findPacienteByIdentificacion: async () => null,
  }

  return { repo, getCreated: () => created }
}

const validParams: CreateCitaParams = {
  titulo: 'Consulta',
  inicio: '2026-08-27 09:00:00',
  fin: '2026-08-27 10:00:00',
  tipo: 'consulta',
  estado: 'pendiente',
}

describe('CitasService appointment sources', () => {
  test('maps a legacy source code to the tenant source name', async () => {
    const fixture = createRepository(['En persona', 'Llamada'])
    const service = new CitasService(fixture.repo)

    await service.create({ ...validParams, source: 'en_persona' })

    assert.equal(fixture.getCreated()?.source, 'En persona')
  })

  test('uses a configured tenant source when an old client omits it', async () => {
    const fixture = createRepository(['Recepción', 'Llamada'])
    const service = new CitasService(fixture.repo)

    await service.create(validParams)

    assert.equal(fixture.getCreated()?.source, 'Recepción')
  })

  test('rejects an unknown source before attempting the insert', async () => {
    const fixture = createRepository(['En persona', 'Llamada'])
    const service = new CitasService(fixture.repo)

    await assert.rejects(
      service.create({ ...validParams, source: 'Chat externo' }),
      (error: any) => error?.name === 'validation_errors'
        && error?.errors?.[0]?.msg === 'El origen de la cita seleccionado no es válido.'
    )
    assert.equal(fixture.getCreated(), null)
  })
})
