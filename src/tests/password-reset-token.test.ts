import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'

process.env.SECRET_JWT_TOKEN = 'test-only-reset-token-secret'
process.env.DB_HOST ??= '127.0.0.1'
process.env.DB_USER ??= 'test'
process.env.DB_PASSWORD ??= 'test'
process.env.DB_GLOBAL_SCHEMA ??= 'test'
const { generatePasswordResetToken, generateToken, verifyPasswordResetToken, verifyToken, hashResetToken }: typeof import('../utils/jwtUtils') = require('../utils/jwtUtils')

test('password recovery tokens cannot authenticate as session tokens', () => {
  const token = generatePasswordResetToken(randomUUID(), 'CLINIC', 3)
  assert.throws(() => verifyToken(token), /sesión inválido/)
  assert.equal(verifyPasswordResetToken(token).purpose, 'password_reset')
  const session = generateToken(randomUUID(), 'CLINIC', 'tenant', 3)
  assert.equal(verifyToken(session).dbName, 'tenant')
  assert.throws(() => verifyPasswordResetToken(session), /inválido/)
})

test('each recovery request has a distinct token even within the same second', () => {
  const userId = randomUUID()
  const first = generatePasswordResetToken(userId, 'CLINIC', 0)
  const second = generatePasswordResetToken(userId, 'CLINIC', 0)
  assert.notEqual(first, second)
  assert.match(hashResetToken(first), /^[a-f0-9]{64}$/)
  assert.notEqual(hashResetToken(first), hashResetToken(second))
  assert.ok(verifyPasswordResetToken(first).exp > Date.now() / 1000)
})
