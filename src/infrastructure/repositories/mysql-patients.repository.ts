import { ResultSetHeader } from 'mysql2'
import { PatientCreateParams, PatientsRepository, PatientUpdateParams } from '../../application/ports/patients.repository'
import { Patient } from '../../domain/entities/Patient'
import { Database } from '../database/Database'
import { patientQueries } from '../database/queries/patients.queries'

export class MysqlPatientsRepository implements PatientsRepository {
    async findAll(args: { limit: number; offset: number; term?: string }): Promise<Patient[]> {
        const query = patientQueries('read', args)
        return Database.execute<Patient[]>(query)
    }

    async findById(id: number): Promise<Patient | null> {
        const query = patientQueries('read-one')
        const result = await Database.execute<Patient[]>(query, [id])
        return result[0] ?? null
    }

    async create(params: PatientCreateParams): Promise<number> {
        const { birthdate, firstName, lastName, address, gender, phone, email, id } = params
        const query = patientQueries('create')
        const values = [firstName, lastName, birthdate, phone, email, address, id, gender]
        const result = await Database.execute<ResultSetHeader>(query, values)
        return result.insertId
    }

    async update(id: number, params: PatientUpdateParams): Promise<number> {
        const { firstName, lastName, phone, email, address, gender, birthdate } = params
        const query = patientQueries('update')
        const values = [firstName, lastName, birthdate, phone, email, address, gender, id]
        const result = await Database.execute<ResultSetHeader>(query, values)
        return result.affectedRows
    }

    async softDelete(id: number): Promise<number> {
        const query = patientQueries('soft-delete')
        const result = await Database.execute<ResultSetHeader>(query, [0, id])
        return result.affectedRows
    }
}
