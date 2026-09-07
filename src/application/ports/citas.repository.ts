import { Cita, CitaTipo, CitaEstado, RecursoTipo } from '../../domain/entities/Cita'

export interface CreateCitaParams {
  titulo:                   string
  descripcion?:             string | null
  inicio:                   string
  fin:                      string
  personalId?:              string | null
  pacienteId?:              string | null
  pacienteIdentificacion?:  string | null
  nombrePaciente?:          string | null
  recursoTipo?:             RecursoTipo | null
  recursoId?:               string | null
  tipo:                     CitaTipo
  estado:                   CitaEstado
  source?:                  string
  chatbotSesionId?:         string | null
  notas?:                   string | null
  creadoPor?:               string | null
}

export interface UpdateCitaParams {
  citaId:                   string
  titulo:                   string
  descripcion?:             string | null
  inicio:                   string
  fin:                      string
  personalId?:              string | null
  pacienteId?:              string | null
  pacienteIdentificacion?:  string | null
  nombrePaciente?:          string | null
  recursoTipo?:             RecursoTipo | null
  recursoId?:               string | null
  tipo:                     CitaTipo
  estado:                   CitaEstado
  source?:                  string
  notas?:                   string | null
}

export interface CitasRepository {
  list(start: string, end: string): Promise<Cita[]>
  listUpcoming(): Promise<Cita[]>
  findById(id: string): Promise<Cita | null>
  create(params: CreateCitaParams): Promise<string>
  update(params: UpdateCitaParams): Promise<void>
  delete(id: string): Promise<void>
  listDoctors(): Promise<{ id: string; nombre: string; especialidad: string }[]>
  listSources(): Promise<string[]>
  checkDoctorConflict(personalId: string, inicio: string, fin: string, excludeCitaId?: string): Promise<boolean>
  findPacienteByIdentificacion(identificacion: string): Promise<string | null>
}
