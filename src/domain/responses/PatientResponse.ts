export interface PatientResponse {
    identificationType?: 'identidad' | 'pasaporte' | 'carne_residencia'
    notes?: string
    emergencyContact?: import('../entities/Patient').Patient['emergencyContact']
    id:       string
    name:     string
    lastName: string
    birthDate:Date | null
    phone:    string
    email:    string
    address:  string
    idNumber: string
    gender:   string
}

export interface ShortPatientResponse {
    birthDate?: string | null
    id:       string
    name:     string
}
