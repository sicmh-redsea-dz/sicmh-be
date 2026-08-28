import { CitasRepository, CreateCitaParams, UpdateCitaParams } from '../ports/citas.repository'

const buildError = (name: string, msg: string) => {
  const err: any = new Error(msg)
  err.name = name
  return err
}

const validationError = (msg: string) => {
  const err: any = new Error(msg)
  err.name = 'validation_errors'
  err.errors = [{ msg }]
  return err
}

export class CitasService {
  constructor(private readonly repo: CitasRepository) {}

  private normalizeSourceKey = (value: string): string => {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  }

  private resolveSource = async (requested?: string | null): Promise<string> => {
    const sources = await this.repo.listSources()
    if (sources.length === 0) {
      throw validationError('No hay orígenes de cita configurados.')
    }

    const value = requested?.trim()
    if (!value) return sources[0]

    const key = this.normalizeSourceKey(value)
    const match = sources.find(source => this.normalizeSourceKey(source) === key)
    if (!match) {
      throw validationError('El origen de la cita seleccionado no es válido.')
    }
    return match
  }

  list = async (start: string, end: string) => {
    return this.repo.list(start, end)
  }

  listUpcoming = async () => {
    return this.repo.listUpcoming()
  }

  findById = async (id: number) => {
    const cita = await this.repo.findById(id)
    if (!cita) throw buildError('not_found_error', 'Cita no encontrada.')
    return cita
  }

  private resolveIdentificacion = async (identificacion?: string | null): Promise<number | null> => {
    if (!identificacion?.trim()) return null
    return this.repo.findPacienteByIdentificacion(identificacion.trim())
  }

  create = async (params: CreateCitaParams) => {
    if (!params.titulo?.trim()) throw validationError('El título es requerido.')
    if (!params.inicio)         throw validationError('La fecha de inicio es requerida.')
    if (!params.fin)            throw validationError('La fecha de fin es requerida.')
    if (new Date(params.inicio) >= new Date(params.fin))
      throw validationError('El inicio debe ser anterior al fin.')

    const pacienteId = await this.resolveIdentificacion(params.pacienteIdentificacion)
    const source = await this.resolveSource(params.source)

    if (params.personalId) {
      const conflict = await this.repo.checkDoctorConflict(params.personalId, params.inicio, params.fin)
      if (conflict) throw validationError('El doctor ya tiene una cita programada en ese horario.')
    }

    const id = await this.repo.create({ ...params, pacienteId, source })
    return this.repo.findById(id)
  }

  update = async (params: UpdateCitaParams) => {
    const existing = await this.repo.findById(params.citaId)
    if (!existing) throw buildError('not_found_error', 'Cita no encontrada.')
    if (!params.titulo?.trim()) throw validationError('El título es requerido.')
    if (new Date(params.inicio) >= new Date(params.fin))
      throw validationError('El inicio debe ser anterior al fin.')

    const pacienteId = await this.resolveIdentificacion(params.pacienteIdentificacion)
    const source = await this.resolveSource(params.source ?? existing.Source)

    if (params.personalId) {
      const conflict = await this.repo.checkDoctorConflict(params.personalId, params.inicio, params.fin, params.citaId)
      if (conflict) throw validationError('El doctor ya tiene una cita programada en ese horario.')
    }

    await this.repo.update({ ...params, pacienteId, source })
    return this.repo.findById(params.citaId)
  }

  delete = async (id: number) => {
    const existing = await this.repo.findById(id)
    if (!existing) throw buildError('not_found_error', 'Cita no encontrada.')
    await this.repo.delete(id)
    return { deleted: true }
  }

  listDoctors = async () => {
    return this.repo.listDoctors()
  }

  listSources = async () => {
    return this.repo.listSources()
  }
}
