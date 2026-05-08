export type CitaTipo   = 'consulta' | 'cirugia' | 'hospitalizacion' | 'seguimiento' | 'otro'
export type CitaEstado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
export type RecursoTipo = 'quirofano' | 'cama'

export interface Cita {
  CitaID:        number
  Titulo:        string
  Descripcion?:  string | null
  Inicio:        string
  Fin:           string
  Tipo:          CitaTipo
  Estado:        CitaEstado
  RecursoTipo?:  RecursoTipo | null
  RecursoID?:    string | null
  Source:             string
  ExternalId?:        string | null
  ChatbotSesionID?:   string | null
  Notas?:             string | null
  PersonalID?:              number | null
  NombreDoctor?:            string | null
  PacienteID?:              number | null
  PacienteIdentificacion?:  string | null
  NombrePaciente?:          string | null
  CreadoPor?:    number | null
  CreadoEn?:     string
  ActualizadoEn?: string
}
