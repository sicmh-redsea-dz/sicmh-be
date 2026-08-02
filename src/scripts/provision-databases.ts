import mysql from 'mysql2/promise'
import { config } from '../config/env'

const databaseNamePattern = /^[a-zA-Z0-9_]+$/

const databaseName = (name: string, envName: string): string => {
  if (!databaseNamePattern.test(name)) {
    throw new Error(`${envName} must contain only letters, numbers, and underscores.`)
  }
  return name
}

const main = async () => {
  const globalDatabase = databaseName(config.DB_GLOBAL_SCHEMA, 'DB_GLOBAL_SCHEMA')
  const tenantDatabase = databaseName(process.env.DB_TENANT_SCHEMA ?? '', 'DB_TENANT_SCHEMA')
  const connection = await mysql.createConnection({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
  })

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${globalDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${tenantDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  } finally {
    await connection.end()
  }

  console.log(`Provisioned databases: ${globalDatabase}, ${tenantDatabase}`)
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
