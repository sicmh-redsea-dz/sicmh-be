import { ResultSetHeader } from 'mysql2'
import { VisitsRepository } from '../../application/ports/visits.repository'
import { History, ShortHistory } from '../../domain/entities/History'
import { ShortPatient } from '../../domain/entities/Patient'
import { Staff } from '../../domain/entities/Staff'
import { Database } from '../database/Database'
import { visitsQueries } from '../database/queries/visits.queries'

export class MysqlVisitsRepository implements VisitsRepository {
    async findAll(args: { limit: number; offset: number; term: string; ext: string }): Promise<ShortHistory[]> {
        const query = visitsQueries('all-visits', args)
        const termValues = args.term ? [args.term, args.term, args.term, args.term, args.term] : []
        return Database.execute<ShortHistory[]>(query, termValues)
    }

    async findAllUnbounded(args: { term: string; ext?: string }): Promise<ShortHistory[]> {
        const query = visitsQueries('all-visits-unbounded', args as any)
        const values = args.term ? [args.term, args.term, args.term, args.term, args.term] : []
        return Database.execute<ShortHistory[]>(query, values)
    }

    async findById(id: number): Promise<History | null> {
        const query = visitsQueries('one-visit')
        const result = await Database.execute<History[]>(query, [id])
        return result[0] ?? null
    }

    async findPrescriptionContext(id: number): Promise<any | null> {
        const result = await Database.execute<any[]>(visitsQueries('prescription-context'), [id])
        return result[0] ?? null
    }

    async create(data: Record<string, any>): Promise<number> {
        const { query, values } = this.buildInsertQuery('historia_medica', data)
        const resp = await Database.execute<ResultSetHeader>(query, values)
        return resp.insertId
    }

    async update(id: number, data: Record<string, any>): Promise<number> {
        const payload = { ...data, HistoriaID: id }
        const { query, values } = this.generateUpdateQuery('historia_medica', payload, 'HistoriaID')
        const updatedVisit = await Database.execute<ResultSetHeader>(query, values)
        return updatedVisit.affectedRows
    }

    async softDelete(id: number): Promise<number> {
        const query = visitsQueries('delete-visit')
        const deletedVisit = await Database.execute<ResultSetHeader>(query, [id])
        return deletedVisit.affectedRows
    }

    async findDoctors(term: string): Promise<Staff[]> {
        const query = visitsQueries('get-doctor', { term })
        const values = term ? [term, term] : []
        return Database.execute<Staff[]>(query, values)
    }

    async findPatients(term: string): Promise<ShortPatient[]> {
        const query = visitsQueries('get-patients', { term })
        const parts = term.trim().split(/\s+/)
        const fullNameValues = parts.length > 1
            ? [parts[0], parts.slice(1).join(' ')]
            : []
        const values = term ? [term, term, term, ...fullNameValues, term] : ['']
        return Database.execute<ShortPatient[]>(query, values)
    }

    async findStockItems(subinventoryId: number): Promise<any[]> {
        const query = visitsQueries('get-stock-items')
        return Database.execute<any[]>(query, [subinventoryId])
    }

    private buildInsertQuery(table: string, data: Record<string, any>): { query: string; values: any[] } {
        const keys = Object.keys(data)
        const columns = keys.join(', ')
        const placeholders = keys.map(() => '?').join(', ')
        const values = keys.map((key) => data[key])

        const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders});`
        return { query, values }
    }

    private generateUpdateQuery(tableName: string, data: Record<string, any>, idField: string = 'HistoriaID') {
        if (!data[idField]) {
            throw new Error(`El campo ${idField} es requerido para la actualización`)
        }

        const fieldsToUpdate = Object.keys(data).filter(key => key !== idField)
        if (fieldsToUpdate.length === 0) {
            throw new Error('No hay campos válidos para actualizar')
        }

        const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ')
        const values = fieldsToUpdate.map(field => data[field])
        values.push(data[idField])

        const query = `update ${tableName} set ${setClause} where ${idField} = ?;`
        return { query, values }
    }
}
