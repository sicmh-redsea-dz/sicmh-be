import assert from 'node:assert/strict'
import { test } from 'node:test'
import jwt from 'jsonwebtoken'
import { generateToken, verifyToken } from '../utils/jwtUtils'
import { config } from '../config/env'
import { authMiddleware } from '../api/middlewares/auth.middleware'
import { PoolManager } from '../infrastructure/database/PoolManager'
import { TenantContext } from '../infrastructure/database/TenantContext'
import { AuthController } from '../api/controllers/auth.controller'
import { ServiceContainer } from '../infrastructure/container/service.container'

const request = async (token: string) => {
  let status = 200, continued = false, failure: unknown
  const req: any = { header: () => `Bearer ${token}` }
  const res: any = { status(value: number) { status = value; return this }, json() {} }
  await authMiddleware(req, res, (error?: unknown) => { failure = error; continued = !error })
  assert.equal(failure, undefined)
  return { status, continued, payload: req.user }
}

test('renewal keeps the original session version and start, and never extends an eight-hour day', async () => {
  const now = Math.floor(Date.now() / 1000)
  const sessionStartedAt = now - 7 * 3600 - 50 * 60
  const payload: any = verifyToken(generateToken('user', 'TEST', 'tenant', 7, sessionStartedAt))
  assert.equal(payload.sv, 7)
  assert.equal(payload.sessionStartedAt, sessionStartedAt)
  assert.equal(payload.exp, sessionStartedAt + 8 * 3600)
  assert.throws(() => generateToken('user', 'TEST', 'tenant', 7, now - 8 * 3600))
  const initial: any = verifyToken(generateToken('user', 'TEST', 'tenant', 7))
  assert.ok(initial.exp - initial.iat <= 30 * 60)
})

test('expired, invalidated and deleted-account tokens cannot pass the renewal middleware', async () => {
  const original = PoolManager.getPool
  let version = 2
  let deleted = false
  const db: any = { select: () => {
    const query: any = { from: () => query, where: () => query,
      limit: async () => deleted ? [] : [{ sessionVersion: version }] }
    return query
  } }
  PoolManager.getPool = async () => ({ db, pool: {} as any, dbName: 'tenant' })
  try {
    const old = generateToken('user', 'TEST', 'tenant', 1)
    assert.equal((await request(old)).status, 401)
    const active = generateToken('user', 'TEST', 'tenant', 2)
    assert.equal((await request(active)).continued, true)
    version++ // Another login invalidates both the original and all renewed tokens.
    assert.equal((await request(active)).status, 401)
    deleted = true
    assert.equal((await request(generateToken('user', 'TEST', 'tenant', version))).status, 401)
    const expired = jwt.sign({ uid: 'user', codigoEmpresa: 'TEST', dbName: 'tenant', sv: version },
      config.SECRET_JWT_TOKEN, { expiresIn: -1 })
    assert.equal((await request(expired)).status, 401)
  } finally { PoolManager.getPool = original }
})

test('renew endpoint issues a replacement without changing session version or original start', async () => {
  const original = ServiceContainer.getAuthService
  ServiceContainer.getAuthService = () => ({ checkToken: async () => ({ _id: 'user' }) }) as any
  try {
    const controller = new AuthController()
    const start = Math.floor(Date.now() / 1000) - 3600
    let result: any, failure: unknown
    const res: any = { status() { return this }, json(value: any) { result = value } }
    await (controller.renewSession as any)({ user: { uid: 'user', codigoEmpresa: 'TEST', dbName: 'tenant', sv: 5, sessionStartedAt: start } },
      res, (error: unknown) => { failure = error })
    assert.equal(failure, undefined)
    const payload = verifyToken(result.token)
    assert.equal(payload.sv, 5); assert.equal(payload.sessionStartedAt, start)
  } finally { ServiceContainer.getAuthService = original }
})


test('simultaneous logins allocate unique versions on real MySQL', {
  skip: process.env.RUN_SESSION_DB_TEST !== '1',
}, async () => {
  assert.ok(['127.0.0.1', 'localhost'].includes(config.DB_HOST), 'Local MySQL only')
  const mysql = await import('mysql2/promise')
  const { randomUUID } = await import('node:crypto')
  const { createTenantDatabase } = await import('../infrastructure/database/drizzle')
  const { MysqlAuthRepository } = await import('../infrastructure/repositories/mysql-auth.repository')
  const database = `medit_session_test_${randomUUID().replace(/-/g, '')}`
  assert.match(database, /^medit_session_test_[a-f0-9]{32}$/)
  const options = { host: config.DB_HOST, port: config.DB_PORT, user: config.DB_USER, password: config.DB_PASSWORD }
  const connection = await mysql.createConnection(options)
  let pool: ReturnType<typeof mysql.createPool> | undefined
  try {
    await connection.query(`CREATE DATABASE \`${database}\``)
    pool = mysql.createPool({ ...options, database, connectionLimit: 6 })
    await pool.query('CREATE TABLE users (id varchar(36) PRIMARY KEY, session_version int NOT NULL DEFAULT 0, deleted_at timestamp NULL) ENGINE=InnoDB')
    await pool.query('INSERT INTO users (id) VALUES (?)', ['test-user'])
    const db = createTenantDatabase(pool)
    const repo = new MysqlAuthRepository()
    const versions = await TenantContext.run(pool, db, () => Promise.all(
      Array.from({ length: 12 }, () => repo.incrementSessionVersion('test-user', 0))))
    assert.deepEqual(versions.sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i + 1))
    assert.equal(await TenantContext.run(pool, db, () => repo.getSessionVersion('test-user')), 12)
  } finally {
    await pool?.end()
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await connection.end()
  }
})
