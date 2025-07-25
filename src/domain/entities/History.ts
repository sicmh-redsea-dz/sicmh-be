export interface ShortHistory {
    HistoriaID:         number
    NombreDoctor:       string
    NombrePaciente:     string
    IdPaciente:         string
    FechaUltimaVisita:  string
    Diagnostico:        string
    InvoiceNumber:      string
    Estado:             string
    total_registries:   number
}

export interface History {
    HistoriaID:        number
    PacienteID:        number
    FechaVisita:       Date
    Diagnostico:       string | null
    Tratamiento:       string | null
    Notas:             string
    Presion:           string
    Oxigenacion:       number
    Temperatura:       string
    Glucometria:       string
    Peso:              string
    Altura:            string
    IMC:               string | null
    PorcentajeGrasa:   string | null
    GrasaVisceral:     string | null
    EdadSegunPeso:     string | null
    FechaUltimaVisita: Date
    isActive:          number
    TipoVisita:        string
    FacturaID:         number
    PersonalID:        number
}  