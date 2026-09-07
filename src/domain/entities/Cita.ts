export type CitaTipo   = 'consulta' | 'cirugia' | 'hospitalizacion' | 'seguimiento' | 'otro'
export type CitaEstado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
export type RecursoTipo = 'quirofano' | 'cama'
export type CitaSource = 'manual' | 'chatbot' | 'google_calendar' | 'en_persona' | 'llamada'

export interface Cita {
  CitaID:        string
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
  PersonalID?:              string | null
  NombreDoctor?:            string | null
  PacienteID?:              string | null
  PacienteIdentificacion?:  string | null
  NombrePaciente?:          string | null
  CreadoPor?:    string | null
  CreadoEn?:     string
  ActualizadoEn?: string
}
