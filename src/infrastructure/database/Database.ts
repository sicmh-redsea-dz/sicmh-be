import { pool } from '../../config/db'

export class Database {
    static async execute<T>(query: string, values?:any[]): Promise<T> {
        try {
            const [result] = await pool.execute(query, values)
            return result as T
        } catch ( err:any ) {
            throw err
        }
    }

    static async query<T>(query: string): Promise<T> {
        try {
            const [result] = await pool.query(query)
            return result as T
        } catch ( err:any ) {
            throw err
        }
    }
}