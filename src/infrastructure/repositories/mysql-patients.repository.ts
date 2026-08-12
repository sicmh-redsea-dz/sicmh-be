import { ResultSetHeader } from 'mysql2'
import { PatientCreateParams, PatientsRepository, PatientUpdateParams } from '../../application/ports/patients.repository'
import { Patient } from '../../domain/entities/Patient'
import { Database } from '../database/Database'
import { patientQueries } from '../database/queries/patients.queries'

interface EmergencyContactIdRow {
    EmergencyContactID: number
}

export class MysqlPatientsRepository implements PatientsRepository {
    async findAll(args: { limit: number; offset: number; term?: string }): Promise<Patient[]> {
        const query = patientQueries('read', args)
        const values = args.term ? [args.term, args.term, args.term] : []
        return Database.execute<Patient[]>(query, values)
    }

    async findById(id: number): Promise<Patient | null> {
        const query = patientQueries('read-one')
        const result = await Database.execute<Patient[]>(query, [id])
        return result[0] ?? null
    }

    async create(params: PatientCreateParams): Promise<number> {
        const { birthdate, firstName, lastName, address, gender, phone, email, id, emergencyContact } = params
        return Database.transaction(async () => {
            const query = patientQueries('create')
            const values = [firstName, lastName, birthdate, phone, email, address, id, gender]
            const result = await Database.execute<ResultSetHeader>(query, values)
            await this.saveEmergencyContact(result.insertId, emergencyContact)
            return result.insertId
        })
    }

    async update(id: number, params: PatientUpdateParams): Promise<number> {
        const { firstName, lastName, phone, email, address, gender, birthdate, emergencyContact } = params
        return Database.transaction(async () => {
            const query = patientQueries('update')
            const values = [firstName, lastName, birthdate, phone, email, address, gender, id]
            const result = await Database.execute<ResultSetHeader>(query, values)
            await this.saveEmergencyContact(id, emergencyContact)
            return Math.max(result.affectedRows, 1)
        })
    }

    async softDelete(id: number): Promise<number> {
        const query = patientQueries('soft-delete')
        const result = await Database.execute<ResultSetHeader>(query, [0, id])
        return result.affectedRows
    }

    private async saveEmergencyContact(
        patientId: number,
        contact: PatientCreateParams['emergencyContact'] | undefined
    ): Promise<void> {
        if (!contact) return

        const values = [
            contact.name,
            contact.relationship,
            contact.phone,
            contact.email?.trim() || null,
            contact.address?.trim() || null
        ]
        const existing = await Database.execute<EmergencyContactIdRow[]>(
            patientQueries('find-emergency-contact'),
            [patientId]
        )

        if (existing[0]) {
            await Database.execute<ResultSetHeader>(
                patientQueries('update-emergency-contact'),
                [...values, existing[0].EmergencyContactID]
            )
            return
        }

        await Database.execute<ResultSetHeader>(
            patientQueries('create-emergency-contact'),
            [patientId, ...values]
        )
    }
}
