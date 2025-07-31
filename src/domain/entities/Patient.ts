export interface Patient {
    PacienteID: number
    Nombre: string
    Apellido: string
    FechaNacimiento: Date
    Telefono: string
    CorreoElectronico: string
    Direccion: string
    Identificacion: string
    IsActive?: boolean
    Genero: string
    total_registries: number
}

export interface ShortPatient {
    PacienteID: number
    NombrePersonal: string
}