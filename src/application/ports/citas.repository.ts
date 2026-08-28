import { Cita, CitaTipo, CitaEstado, RecursoTipo } from '../../domain/entities/Cita'

export interface CreateCitaParams {
  titulo:                   string
  descripcion?:             string | null
  inicio:                   string
  fin:                      string
  personalId?:              number | null
  pacienteId?:              number | null
  pacienteIdentificacion?:  string | null
  nombrePaciente?:          string | null
  recursoTipo?:             RecursoTipo | null
  recursoId?:               string | null
  tipo:                     CitaTipo
  estado:                   CitaEstado
  source?:                  string | null
  chatbotSesionId?:         string | null
  notas?:                   string | null
  creadoPor?:               number | null
}

export interface UpdateCitaParams {
  citaId:                   number
  titulo:                   string
  descripcion?:             string | null
  inicio:                   string
  fin:                      string
  personalId?:              number | null
  pacienteId?:              number | null
  pacienteIdentificacion?:  string | null
  nombrePaciente?:          string | null
  recursoTipo?:             RecursoTipo | null
  recursoId?:               string | null
  tipo:                     CitaTipo
  estado:                   CitaEstado
  source?:                  string | null
  notas?:                   string | null
}

export interface CitasRepository {
  list(start: string, end: string): Promise<Cita[]>
  listUpcoming(): Promise<Cita[]>
  findById(id: number): Promise<Cita | null>
  create(params: CreateCitaParams): Promise<number>
  update(params: UpdateCitaParams): Promise<void>
  delete(id: number): Promise<void>
  listDoctors(): Promise<{ id: number; nombre: string; especialidad: string }[]>
  listSources(): Promise<string[]>
  checkDoctorConflict(personalId: number, inicio: string, fin: string, excludeCitaId?: number): Promise<boolean>
  findPacienteByIdentificacion(identificacion: string): Promise<number | null>
}
