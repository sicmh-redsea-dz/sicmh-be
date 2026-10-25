import mysql from 'mysql2/promise'
import { randomUUID } from 'node:crypto'
import { hashPassword } from '../utils/passwordUtils'
import { config } from '../config/env'

const main = async () => {
  if (process.env.STAGING_BOOTSTRAP !== 'true' || process.env.DEFAULT_COMPANY_CODE !== 'MEDITQA') {
    throw new Error('This bootstrap is restricted to the MEDITQA staging company.')
  }
  const password = process.env.QA_ADMIN_PASSWORD
  if (!password || password.length < 20) throw new Error('QA_ADMIN_PASSWORD is required.')
  const connection = await mysql.createConnection({
    host: config.DB_HOST, port: config.DB_PORT, user: config.DB_USER,
    password: config.DB_PASSWORD, database: process.env.DB_TENANT_SCHEMA,
  })
  try {
    const [existing] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?', ['qa.admin@example.com'],
    )
    if (existing.length) { console.log('Staging admin already exists; password retained.'); return }
    const [roles] = await connection.query<mysql.RowDataPacket[]>('SELECT id FROM roles WHERE `key` = ?', ['admin'])
    if (!roles.length) throw new Error('Seed the admin role first.')
    await connection.execute(
      'INSERT INTO users (id, role_id, name, email, password_hash, provider, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [randomUUID(), roles[0].id, 'Administracion QA', 'qa.admin@example.com', await hashPassword(password), 'conventional', 1],
    )
    console.log('Staging admin created: qa.admin@example.com (company MEDITQA).')
  } finally { await connection.end() }
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
