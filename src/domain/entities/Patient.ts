export interface Patient {
    PacienteID: number
    Nombre: string
    Apellido: string
    FechaNacimiento: Date
    Telefono: string
    CorreoElectronico: string | null
    Direccion: string
    Identificacion: string
    TipoIdentificacion: 'identidad' | 'pasaporte' | 'carne_residencia'
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
