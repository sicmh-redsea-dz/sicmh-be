import { Request } from 'express'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { asyncHandler } from '../decorators/asyncHandler'

export class CitasController {
  private get service() {
    return ServiceContainer.getCitasService()
  }

  @asyncHandler({ mode: 'payload' })
  async listUpcoming(_req: Request): Promise<any> {
    const data = await this.service.listUpcoming()
    return { data }
  }

  @asyncHandler({ mode: 'payload' })
  async list(req: Request): Promise<any> {
    const now = new Date()
    const start = (req.query['start'] as string) || new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const end   = (req.query['end']   as string) || new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    const data = await this.service.list(start, end)
    return { data }
  }

  @asyncHandler({ mode: 'payload' })
  async findById(req: Request): Promise<any> {
    const data = await this.service.findById(String(req.params['id']))
    return { data }
  }

  @asyncHandler({ mode: 'payload', statusCode: 201 })
  async create(req: Request): Promise<any> {
    const uid = (req as any).user?.uid
    const { titulo, descripcion, inicio, fin, personalId,
            pacienteIdentificacion, nombrePaciente,
            recursoTipo, recursoId, tipo, estado, source, notas } = req.body
    const data = await this.service.create({
      titulo, descripcion, inicio, fin,
      personalId:             personalId ? String(personalId) : null,
      pacienteIdentificacion: pacienteIdentificacion || null,
      nombrePaciente:         nombrePaciente         || null,
      recursoTipo: recursoTipo || null,
      recursoId:   recursoId   || null,
      tipo:   tipo   || 'consulta',
      estado: estado || 'pendiente',
      source: source || 'en_persona',
      notas,
      creadoPor: uid ? String(uid) : null,
    })
    return { data }
  }

  @asyncHandler({ mode: 'payload' })
  async update(req: Request): Promise<any> {
    const citaId = String(req.params['id'])
    const { titulo, descripcion, inicio, fin, personalId,
            pacienteIdentificacion, nombrePaciente,
            recursoTipo, recursoId, tipo, estado, source, notas } = req.body
    const data = await this.service.update({
      citaId, titulo, descripcion, inicio, fin,
      personalId:             personalId ? String(personalId) : null,
      pacienteIdentificacion: pacienteIdentificacion || null,
      nombrePaciente:         nombrePaciente         || null,
      recursoTipo: recursoTipo || null,
      recursoId:   recursoId   || null,
      tipo:   tipo   || 'consulta',
      estado: estado || 'pendiente',
      source: source || 'en_persona',
      notas,
    })
    return { data }
  }

  @asyncHandler({ mode: 'payload' })
  async delete(req: Request): Promise<any> {
    const data = await this.service.delete(String(req.params['id']))
    return { data }
  }

  @asyncHandler({ mode: 'payload' })
  async listDoctors(_req: Request): Promise<any> {
    const data = await this.service.listDoctors()
    return { data }
  }

  @asyncHandler({ mode: 'payload' })
  async listSources(_req: Request): Promise<any> {
    const data = await this.service.listSources()
    return { data }
  }
}
