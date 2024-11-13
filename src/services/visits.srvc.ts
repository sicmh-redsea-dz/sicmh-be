import { Pool, ResultSetHeader } from "mysql2/promise";
import { VisitsResponse, FormVisit, VisitResponse, TotalRegistriesResponse } from "../models/visit.model";
import { queries } from "../helper/visits/queries";

enum queryKeys {
  Update    = 'update',
  Create    = 'create',
  AllDocs   = 'all-docs',
  OneVisit  = 'getOneVisit',
  AllVisits = 'all-visits',
  TotalReg  = 'total-registries',
  SoftDelete= 'delete'
}
interface VisitsRow {
  HistoriaID        : number,
  Diagnostico       : string,
  NombreDoctor      : string,
  NombrePaciente    : string,
  FechaUltimaVisita : string,
}

interface VisitRow {
  HistoriaID: number
  PacienteID: number
  DoctorID: number
  FechaVisita: string
  Diagnostico: string
  Tratamiento: string
  Notas: string
  Presion: string
  Oxigenacion: number
  Temperatura: number
  Glucometria: number
  Peso: number
  Altura: number
  IMC: number
  PorcentajeGrasa: number
  GrasaVisceral: number
  EdadSegunPeso: number
  FechaUltimaVisita: string
}
interface Pagination {
  limit: number,
  offset: number
}
export class VisitsService {
  constructor(private pool: Pool) {}

  public async findAll(pagination: Pagination): Promise<[VisitsResponse[], number]> {
    const { limit, offset } = pagination
    const query = queries(queryKeys.AllVisits, limit, offset)
    try {
      const [ response ] = await this.pool.execute<[VisitsRow[], any]>(query);
      const formmattedData = this.formatDataResponse( response )
      const totalRegistries = await this.totalRegistries()
      return [formmattedData, totalRegistries]
    } catch( err: any ) {
      throw new Error( err )
    }
  }

  public async findOneVisit( id: string ): Promise<VisitResponse> {
    const query = queries( queryKeys.OneVisit )
    const value = [parseInt( id )]
    try {
      const [ response ] = await this.pool.execute<[VisitRow,any]>( query, value )
      const formatData = this.formatLongResponse( response )
      return formatData
    } catch ( err: any ) {
      throw new Error( err )
    }
  }

  public async saveNewVisit(visitForm: FormVisit): Promise<number> {
    const values = this.convertVisitForm(visitForm)
    const query = queries(queryKeys.Create)
    try{
      const [ response ]: [ResultSetHeader, any] = await this.pool.execute( query, values )
      const { insertId } = response
      return insertId
    } catch ( err: any ) {
      throw new Error( err )
    }
  }

  public async editVisit(id: string, visitForm: FormVisit ): Promise<number> {
    const queryToUpdate = queries( queryKeys.Update )
    const queryToRead = queries( queryKeys.OneVisit )
    const values = [...this.convertVisitForm(visitForm), id]
    try {
      await this.pool.execute(queryToUpdate, values)
      const [ response ] = await this.pool.execute<[VisitRow[], any]>(queryToRead, [parseInt( id )])
      const formattedData = this.formatDataResponse( response )
      return formattedData[0].id
    } catch ( err: any ) {
      throw new Error( err )
    }
  }

  public async softDeletePatient(id: number): Promise<boolean> {
    const query = queries( queryKeys.SoftDelete )
    const values = [0, id]
    try {
      await this.pool.execute(query, values)
      return true
    } catch ( err: any ) {
      throw new Error( err )
    }
  }

  public async findAllDocs(): Promise<any[]> {
    const query = queries( queryKeys.AllDocs )
    try{
      const [ response ] = await this.pool.execute<[[], any]>(query)
      return response.map(( doctor ) => {
        const { DoctorID, NombreDoctor } = doctor
        return { id: DoctorID, name: NombreDoctor }
      })
    } catch ( err: any ) {
      throw new Error( err )
    }
  }

  private async totalRegistries(): Promise<number> {
    const query = queries(queryKeys.TotalReg)
    try {
      const [ response ] = await this.pool.execute<[TotalRegistriesResponse, any]>(query)
      const [ totalRegistries ]  = response
      return totalRegistries['total_registries']
    } catch( err: any ) {
      throw new Error( err )
    }
  }

  private convertVisitForm(data: FormVisit): any[] {
    const {patient, doctor, date, diagnosis, treatment, notes, pressure, oxygenation, temperature, glucometry, weight, height, BMI, fatPercentage, visceralFat, ageAccordingToWeight} = data
    const values = [patient, doctor, date, diagnosis, treatment, notes, pressure, oxygenation, temperature, glucometry, weight, parseFloat(height)/100, parseFloat(BMI), parseFloat(fatPercentage), parseFloat(visceralFat), parseInt(ageAccordingToWeight), date]
    return values
  }

  private formatDataResponse(data: VisitsRow[]): VisitsResponse[] {
    return data.map((visit: VisitsRow) => {
      const { HistoriaID: id, NombreDoctor: doctorName, NombrePaciente: patientName, FechaUltimaVisita: lastVisitDate, Diagnostico: diagnosis } = visit
      return { id, doctorName, patientName, lastVisitDate, diagnosis }
    })
  }

  private formatLongResponse(data: VisitRow[]): VisitResponse {
    const visit = data[0];
    const { 
      HistoriaID: id, 
      PacienteID: patient, 
      DoctorID: doctor, 
      FechaVisita: date, 
      Diagnostico: diagnosis, 
      Tratamiento: treatment, 
      Notas: notes, 
      Presion: pressure, 
      Oxigenacion: oxygenation, 
      Temperatura: temperature, 
      Glucometria: glucometry, 
      Peso: weight, 
      Altura: height, 
      IMC: BMI, 
      PorcentajeGrasa: fatPercentage, 
      GrasaVisceral: visceralFat, 
      EdadSegunPeso: ageAccordingToWeight 
    } = visit;
  
    return { 
      id, BMI, date, notes, height, weight, doctor, patient, pressure, diagnosis, treatment, 
      glucometry, temperature, oxygenation, visceralFat, fatPercentage, ageAccordingToWeight 
    };
  }
}