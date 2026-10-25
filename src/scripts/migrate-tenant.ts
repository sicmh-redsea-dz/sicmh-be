import 'dotenv/config'
import mysql from 'mysql2/promise'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { createTenantDatabase } from '../infrastructure/database/drizzle'
import { assertTenantMigrationHistory } from '../infrastructure/database/migration-history'

async function main() {
  const database = process.env.DB_TENANT_SCHEMA?.trim()
  if (!database) throw new Error('DB_TENANT_SCHEMA is required.')
  const pool = mysql.createPool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database, connectionLimit: 1 })
  try {
    await assertTenantMigrationHistory(pool)
    await migrate(createTenantDatabase(pool), { migrationsFolder: './drizzle/tenant' })
  } finally { await pool.end() }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
