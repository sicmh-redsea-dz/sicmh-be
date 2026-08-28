import { Request, Response, NextFunction } from 'express'
import { ServiceContainer } from '../../infrastructure/container/service.container'

export class CitasController {
  private get service() {
    return ServiceContainer.getCitasService()
  }

  listUpcoming = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listUpcoming()
      res.json({ data })
    } catch (err) { next(err) }
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date()
      const start = (req.query['start'] as string) || new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const end   = (req.query['end']   as string) || new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      const data = await this.service.list(start, end)
      res.json({ data })
    } catch (err) { next(err) }
  }

  findById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.findById(Number(req.params['id']))
      res.json({ data })
    } catch (err) { next(err) }
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = (req as any).user?.uid
      const { titulo, descripcion, inicio, fin, personalId,
              pacienteIdentificacion, nombrePaciente,
              recursoTipo, recursoId, tipo, estado, source, notas } = req.body
      const data = await this.service.create({
        titulo, descripcion, inicio, fin,
        personalId:             personalId ? Number(personalId) : null,
        pacienteIdentificacion: pacienteIdentificacion || null,
        nombrePaciente:         nombrePaciente         || null,
        recursoTipo: recursoTipo || null,
        recursoId:   recursoId   || null,
        tipo:   tipo   || 'consulta',
        estado: estado || 'pendiente',
        source: typeof source === 'string' ? source : null,
        notas,
        creadoPor: uid ? Number(uid) : null,
      })
      res.status(201).json({ data })
    } catch (err) { next(err) }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const citaId = Number(req.params['id'])
      const { titulo, descripcion, inicio, fin, personalId,
              pacienteIdentificacion, nombrePaciente,
              recursoTipo, recursoId, tipo, estado, source, notas } = req.body
      const data = await this.service.update({
        citaId, titulo, descripcion, inicio, fin,
        personalId:             personalId ? Number(personalId) : null,
        pacienteIdentificacion: pacienteIdentificacion || null,
        nombrePaciente:         nombrePaciente         || null,
        recursoTipo: recursoTipo || null,
        recursoId:   recursoId   || null,
        tipo:   tipo   || 'consulta',
        estado: estado || 'pendiente',
        source: typeof source === 'string' ? source : null,
        notas,
      })
      res.json({ data })
    } catch (err) { next(err) }
  }

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.delete(Number(req.params['id']))
      res.json({ data })
    } catch (err) { next(err) }
  }

  listDoctors = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listDoctors()
      res.json({ data })
    } catch (err) { next(err) }
  }

  listSources = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listSources()
      res.json({ data })
    } catch (err) { next(err) }
  }
}
