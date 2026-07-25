import { PoolConnection } from 'mysql2/promise'
import { TenantContext } from './TenantContext'

const isStaleConnectionError = (err: any) =>
  err?.code === 'ECONNRESET' || err?.code === 'PROTOCOL_CONNECTION_LOST' || err?.errno === -4077

export class Database {
    static async execute<T>(query: string, values?: any[]): Promise<T> {
        const connection = TenantContext.getConnection()
        if (connection) {
            const [result] = await connection.execute(query, values)
            return result as T
        }

        const pool = TenantContext.getPool()
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
        const connection = TenantContext.getConnection()
        if (connection) {
            const [result] = await connection.query(query)
            return result as T
        }

        const pool = TenantContext.getPool()
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

    // Runs fn with a single dedicated connection threaded through TenantContext,
    // so every Database.execute/query call made inside fn (directly or via any
    // repository) participates in the same transaction with no call-site changes.
    static async transaction<T>(fn: () => Promise<T>): Promise<T> {
        const pool = TenantContext.getPool()
        const connection: PoolConnection = await pool.getConnection()
        try {
            await connection.beginTransaction()
            const result = await TenantContext.runWithConnection(connection, fn)
            await connection.commit()
            return result
        } catch (err) {
            await connection.rollback().catch(() => {})
            throw err
        } finally {
            connection.release()
        }
    }
}