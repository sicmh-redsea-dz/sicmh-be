import { pool } from '../../config/db'

const isStaleConnectionError = (err: any) =>
  err?.code === 'ECONNRESET' || err?.code === 'PROTOCOL_CONNECTION_LOST' || err?.errno === -4077

export class Database {
    static async execute<T>(query: string, values?: any[]): Promise<T> {
        try {
            const [result] = await pool.execute(query, values)
            return result as T
        } catch (err: any) {
            if (isStaleConnectionError(err)) {
                const [result] = await pool.execute(query, values)
                return result as T
            }
            throw err
        }
    }

    static async query<T>(query: string): Promise<T> {
        try {
            const [result] = await pool.query(query)
            return result as T
        } catch (err: any) {
            if (isStaleConnectionError(err)) {
                const [result] = await pool.query(query)
                return result as T
            }
            throw err
        }
    }
}