export interface ShortHistory {
    HistoriaID:         number
    PacienteID:         number
    NombreDoctor:       string
    NombrePaciente:     string
    IdPaciente:         string
    FechaUltimaVisita:  string
    TipoVisita:         string
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

    Ant_Familiar    : string | null
    Ant_Habito      : string | null
    Ant_Patologico  : string | null
    Ant_Quirurgico  : string | null

    NombrePaciente  : string
    NombreDoctor    : string

    InventarioUsado : {InventarioID: number, CantidadUsada: number}[]
}  
