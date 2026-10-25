import mysql from 'mysql2/promise'
import { is, Table } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/mysql-core'
import * as tenantTables from '../infrastructure/database/schema/tenant'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { config } from '../config/env'
import { createGlobalDatabase, createTenantDatabase } from '../infrastructure/database/drizzle'
import { seedDatabases } from './seed'

async function main() {
  if (!process.argv.includes('--confirm-delete-local-data')) throw new Error('Use --confirm-delete-local-data to erase and rebuild the configured local databases.')
  if (!['127.0.0.1', 'localhost', '::1'].includes(config.DB_HOST) || process.env.NODE_ENV === 'production') {
    throw new Error('This reset is restricted to local development MySQL.')
  }
  const globalName = config.DB_GLOBAL_SCHEMA
  const tenantName = process.env.DB_TENANT_SCHEMA ?? ''
  const names = [globalName, tenantName]
  if (globalName === tenantName || names.some(name => !/^[a-zA-Z0-9_]+$/.test(name) || ['mysql', 'sys', 'information_schema', 'performance_schema'].includes(name.toLowerCase()))) {
    throw new Error('Invalid or unsafe database names.')
  }
  for (const key of ['DEFAULT_COMPANY_CODE', 'DEFAULT_COMPANY_NAME']) if (!process.env[key]?.trim()) throw new Error(`Missing ${key}`)
  const credentials = { host: config.DB_HOST, port: config.DB_PORT, user: config.DB_USER, password: config.DB_PASSWORD }
  const connection = await mysql.createConnection(credentials)
  try {
    const [exists] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ?', [globalName, 'companies'],
    )
    if (exists.length) {
      const [others] = await connection.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS total FROM \`${globalName}\`.companies WHERE database_name <> ?`, [tenantName])
      if (Number(others[0].total)) throw new Error('The global registry contains other tenants; refusing to erase their configuration.')
    }
    for (const name of [tenantName, globalName]) {
      await connection.query(`DROP DATABASE IF EXISTS \`${name}\``)
      await connection.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    }
  } finally { await connection.end() }
  const globalPool = mysql.createPool({ ...credentials, database: globalName })
  const tenantPool = mysql.createPool({ ...credentials, database: tenantName })
  try {
    await migrate(createGlobalDatabase(globalPool), { migrationsFolder: './drizzle/global' })
    await migrate(createTenantDatabase(tenantPool), { migrationsFolder: './drizzle/tenant' })
    await seedDatabases()
    const catalogs = new Set(['roles', 'permissions', 'role_permissions', 'payment_methods', 'appointment_types', 'appointment_statuses', 'appointment_sources', 'inventory_locations', 'services'])
    const tables = Object.values(tenantTables).filter(table => is(table, Table)).map(table => getTableConfig(table).name)
    for (const table of tables.filter(name => !catalogs.has(name))) {
      const [rows] = await tenantPool.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS total FROM \`${table}\``)
      if (Number(rows[0].total)) throw new Error(`Unexpected operational data after reset: ${table}`)
    }
    console.log(`Verified ${tables.length} tenant tables; all non-catalog tables are empty.`)
  } finally { await Promise.all([globalPool.end(), tenantPool.end()]) }
  console.log(`Rebuilt local databases ${globalName}, ${tenantName}. Only initial catalogs and company configuration remain.`)
}
void main().catch(error => { console.error(error); process.exitCode = 1 })
