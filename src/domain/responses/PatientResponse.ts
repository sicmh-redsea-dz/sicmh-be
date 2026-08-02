export interface PatientResponse {
    id:       string
    name:     string
    lastName: string
    birthDate:Date
    phone:    string
    email:    string
    address:  string
    idNumber: string
    gender:   string
}

export interface ShortPatientResponse {
    id:       string
    name:     string
}
