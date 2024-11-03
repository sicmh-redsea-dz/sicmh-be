export interface PatientResponse {
  id:        number;
  name:      string;
  lastName:  string;
  birthDate: Date;
  phone:     string;
  email:     string;
  address:   string;
}

export interface FormPatient {
  birthdate : string
  firstName : string
  lastName  : string
  address   : string
  gender    : string
  phone     : string
  email     : string
  image?    : string
  notes?    : string
}
