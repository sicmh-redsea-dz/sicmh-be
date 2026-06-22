import { ResultSetHeader } from 'mysql2'
import { InvoiceRepository } from '../../application/ports/invoice.repository'
import { Database } from '../database/Database'
import { invoiceQueries } from '../database/queries/invoice.queries'

export class MysqlInvoiceRepository implements InvoiceRepository {
    async findAll(args: { limit: number; offset: number; term: string }): Promise<any[]> {
        const query = invoiceQueries('read', args)
        return Database.execute<any[]>(query)
    }

    async findByInvoiceNumber(invoiceNumber: string): Promise<Record<string, any> | null> {
        const query = invoiceQueries('get-one')
        const resp = await Database.execute<any[]>(query, [invoiceNumber])
        return resp[0] ?? null
    }

    async findLatestPendingByPatientAndDate(patientId: number, occurredAt: string): Promise<Record<string, any> | null> {
        const query = invoiceQueries('find-pending-by-patient')
        const resp = await Database.execute<any[]>(query, [patientId, occurredAt])
        return resp[0] ?? null
    }

    async create(data: Record<string, any>): Promise<number> {
        const { query, values } = this.buildInsertQuery('facturas', data)
        const resp = await Database.execute<ResultSetHeader>(query, values)
        return resp.insertId
    }

    async updateByInvoiceNumber(invoiceNumber: string, data: Record<string, any>): Promise<void> {
        const entries = Object.entries(data).map(([key, value]) => {
            return [key, value === undefined ? null : value]
        })

        const setClauses = entries.map(([key]) => `\`${key}\` = ?`).join(', ')
        const values = entries.map(([, value]) => value ?? null)

        const sql = `
            UPDATE \`cami-vime\`.\`facturas\`
            SET ${setClauses}
            WHERE \`InvoiceNumber\` = ?
        `

        await Database.execute(sql, [...values, invoiceNumber])
    }

    async incrementAmountById(invoiceId: number, delta: number): Promise<void> {
        const sql = `
            UPDATE \`cami-vime\`.\`facturas\`
            SET Monto = GREATEST(0, Monto + ?)
            WHERE FacturaID = ?
                AND Estado = 'Pendiente'
        `

        await Database.execute(sql, [delta, invoiceId])
    }

    async softDeleteByInvoiceNumber(invoiceNumber: string): Promise<void> {
        const query = invoiceQueries('delete')
        await Database.execute(query, [0, invoiceNumber])
    }

    async fetchServices(): Promise<any[]> {
        const query = invoiceQueries('getServices')
        return Database.execute<any[]>(query)
    }

    async fetchPaymentMethods(): Promise<any[]> {
        const query = invoiceQueries('getPaymentMethods')
        return Database.execute<any[]>(query)
    }

    async fetchDoctors(): Promise<any[]> {
        const query = invoiceQueries('all-docs')
        return Database.execute<any[]>(query)
    }

    async fetchReportHeader(term?: string): Promise<any[]> {
        const query = invoiceQueries('report-header')
        return Database.execute<any[]>(query, [term])
    }

    async fetchReportSummary(term?: string): Promise<any[]> {
        const query = invoiceQueries('report-summary')
        return Database.execute<any[]>(query, [term])
    }

    async fetchReportPayments(term?: string): Promise<any[]> {
        const query = invoiceQueries('report-payments')
        return Database.execute<any[]>(query, [term])
    }

    async fetchReportCashbox(term?: string): Promise<any[]> {
        const query = invoiceQueries('report-cashbox')
        return Database.execute<any[]>(query, [term, term, term])
    }

    async fetchServiceById(id: number): Promise<{ ServicioID: number; NombreServicio: string; Precio: number } | null> {
        const sql = `SELECT ServicioID, NombreServicio, Precio FROM \`cami-vime\`.\`servicios\` WHERE ServicioID = ? LIMIT 1`
        const rows = await Database.execute<any[]>(sql, [id])
        return rows[0] ?? null
    }

    private buildInsertQuery(table: string, data: Record<string, any>): { query: string; values: any[] } {
        const keys = Object.keys(data)
        const columns = keys.join(', ')
        const placeholders = keys.map(() => '?').join(', ')
        const values = keys.map((key) => data[key])

        const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders});`
        return { query, values }
    }
}
