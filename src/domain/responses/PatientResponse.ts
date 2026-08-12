export interface PatientResponse {
    id:       number
    name:     string
    lastName: string
    birthDate:Date
    phone:    string
    email:    string
    address:  string
    idNumber: string
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
