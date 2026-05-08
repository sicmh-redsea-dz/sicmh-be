import { ResultSetHeader } from 'mysql2'
import { CitasRepository, CreateCitaParams, UpdateCitaParams } from '../../application/ports/citas.repository'
import { Cita } from '../../domain/entities/Cita'
import { Database } from '../database/Database'
import { citasQueries } from '../database/queries/citas.queries'

export class MysqlCitasRepository implements CitasRepository {
  async list(start: string, end: string): Promise<Cita[]> {
    return Database.execute<Cita[]>(citasQueries('list'), [start, end])
  }

  async listUpcoming(): Promise<Cita[]> {
    return Database.query<Cita[]>(citasQueries('list-upcoming'))
  }

  async findById(id: number): Promise<Cita | null> {
    const rows = await Database.execute<Cita[]>(citasQueries('find-by-id'), [id])
    return rows[0] ?? null
  }

  async create(p: CreateCitaParams): Promise<number> {
    const result = await Database.execute<ResultSetHeader>(citasQueries('create'), [
      p.titulo,
      p.descripcion ?? null,
      p.inicio,
      p.fin,
      p.personalId ?? null,
      p.pacienteId ?? null,
      p.nombrePaciente ?? null,
      p.recursoTipo ?? null,
      p.recursoId ?? null,
      p.tipo,
      p.estado,
      p.source ?? 'manual',
      p.chatbotSesionId ?? null,
      p.notas ?? null,
      p.creadoPor ?? null,
    ])
    return result.insertId
  }

  async update(p: UpdateCitaParams): Promise<void> {
    await Database.execute(citasQueries('update'), [
      p.titulo,
      p.descripcion ?? null,
      p.inicio,
      p.fin,
      p.personalId ?? null,
      p.pacienteId ?? null,
      p.nombrePaciente ?? null,
      p.recursoTipo ?? null,
      p.recursoId ?? null,
      p.tipo,
      p.estado,
      p.source ?? 'en_persona',
      p.notas ?? null,
      p.citaId,
    ])
  }

  async findPacienteByIdentificacion(identificacion: string): Promise<number | null> {
    const rows = await Database.execute<{ PacienteID: number }[]>(
      citasQueries('find-paciente-by-identificacion'), [identificacion]
    )
    return rows[0]?.PacienteID ?? null
  }

  async delete(id: number): Promise<void> {
    await Database.execute(citasQueries('delete'), [id])
  }

  async listDoctors(): Promise<{ id: number; nombre: string; especialidad: string }[]> {
    return Database.execute(citasQueries('list-doctors'))
  }

  async listSources(): Promise<string[]> {
    const rows = await Database.query<{ Nombre: string }[]>(citasQueries('list-sources'))
    return rows.map(r => r.Nombre)
  }

  async checkDoctorConflict(personalId: number, inicio: string, fin: string, excludeCitaId = 0): Promise<boolean> {
    const rows = await Database.execute<any[]>(citasQueries('check-doctor-conflict'), [personalId, excludeCitaId, fin, inicio])
    return rows.length > 0
  }
}
