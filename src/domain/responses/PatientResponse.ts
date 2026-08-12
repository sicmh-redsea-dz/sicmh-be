export interface PatientResponse {
    id:       number
    name:     string
    lastName: string
    birthDate:Date
    phone:    string
    email:    string | null
    address:  string
    idNumber: string
    identificationType: 'identidad' | 'pasaporte' | 'carne_residencia'
    gender:   string
    emergencyContact: EmergencyContactResponse | null
}

export interface EmergencyContactResponse {
    id: number
    name: string
    relationship: string
    phone: string
    email: string
    address: string
}

export interface ShortPatientResponse {
    id:       number
    name:     string
}
