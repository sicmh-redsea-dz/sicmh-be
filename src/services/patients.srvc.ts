import { Pool, ResultSetHeader } from 'mysql2/promise';

import { FormPatient, PatientResponse } from '../models/patient.model';
import { queries } from '../helper/patients/queries'

enum queryKeys {
  Read = 'read',
  ReadOne = 'readOne',
  Create = 'create',
  Update = 'update'
}

export interface PatientRow {
  Genero            : string;
  Nombre            : string;
  Apellido          : string;
  Telefono          : string;
  Direccion         : string;
  PacienteID        : number;
  FechaNacimiento   : Date;
  CorreoElectronico : string;
}

export class PatientsService {

  constructor(private pool: Pool) {  }

  public async findAll(): Promise<PatientResponse[]> {
    try {
      const query = queries( queryKeys.Read )
      const [response] = await this.pool.execute<[PatientRow[], any]>(query);
      const formattedResp = this.formatDataForResp(response)
      return formattedResp;
    } catch ( err: any ) {
      throw new Error( err )
    }
  }

  public async findOne(patientId: string): Promise<PatientResponse> {
    try {
      const patient = await this.getUserData( patientId )
      const formattedData = this.formatDataForResp(patient)
      return formattedData[0]
    } catch ( err: any ) {
      throw new Error( err )
    }
  }

  public async saveNewPatient(patient: FormPatient): Promise<PatientResponse> {
    const {firstName, lastName, birthdate, phone, email, address, gender} = patient
    const values = [firstName, lastName, birthdate, phone, email, address, gender]
    const query = queries( queryKeys.Create )
    try {
      const [response]: [ResultSetHeader, any] = await this.pool.execute(query,values)
      const { insertId } = response
      const newPatient = await this.getUserData( insertId )
      const formattedData = this.formatDataForResp( newPatient )
      return formattedData[0]
    } catch( err: any ) {
      console.error('Error exec query: ', err.message)
      if( err.errno === 1062 ) throw new Error('Duplicate entry')
      else throw new Error('Error creating new Patient')
    }
  }

  public async updatePatient(id: string, patient:FormPatient): Promise<PatientResponse> {
    const query = queries( queryKeys.Update )
    const {firstName, lastName, birthdate, phone, email, address, gender} = patient
    const values = [firstName, lastName, birthdate, phone, email, address, gender, id]
    try {
      await this.pool.execute(query, values)
      const updatedPatient = await this.getUserData( id )
      const formattedData = this.formatDataForResp(updatedPatient)
      return formattedData[0]
    } catch ( err: any ) {
      console.error('Error exec query: ', err.message)
      throw new Error('Error editing Patient')
    }

  }

  private formatDataForResp(data: PatientRow | PatientRow[]): PatientResponse[] {
    const isPatientRow = Array.isArray( data )
    const dataToFormat = isPatientRow ? data : [ data ]
    const formattedData = dataToFormat.map((patient: PatientRow) => {
        const { PacienteID:id, Nombre: name, Apellido:lastName, FechaNacimiento:birthDate, Telefono: phone, CorreoElectronico:email, Direccion:address, Genero: gender} = patient
        return {id, name, lastName, birthDate, phone, email, address, gender}
    })
    return formattedData
  }

  private async getUserData(val: string | number): Promise<PatientRow> {
    const query = queries( queryKeys.ReadOne )
    const [response]: [PatientRow[], any] = await this.pool.execute<[PatientRow[], any]>( query, [ val ])
    let [ user ] = response
    return user
  }

}
