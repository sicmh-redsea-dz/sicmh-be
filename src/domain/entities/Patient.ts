export interface Patient {
    PacienteID: string
    Nombre: string
    Apellido: string
    FechaNacimiento: Date | null
    Telefono: string
    CorreoElectronico: string
    Direccion: string
    Identificacion: string
    IsActive?: boolean
    Genero: string
    total_registries: number
    identificationType?: 'identidad' | 'pasaporte' | 'carne_residencia'
    notes?: string
    emergencyContact?: { id: string; name: string; relationship: string; phone: string; email: string; address: string } | null
}

export interface ShortPatient {
    birthDate?: string | null
    PacienteID: string
    NombrePersonal: string
}
