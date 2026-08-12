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
    EmergencyContactID?: number | null
    EmergencyContactName?: string | null
    EmergencyContactRelationship?: string | null
    EmergencyContactPhone?: string | null
    EmergencyContactEmail?: string | null
    EmergencyContactAddress?: string | null
}

export interface ShortPatient {
    PacienteID: number
    NombrePersonal: string
}
