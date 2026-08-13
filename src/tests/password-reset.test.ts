import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import { AuthService } from '../application/services/auth.service'

const activeUser = {
  UsuarioID: 7,
  NombreUsuario: 'Ana',
  CorreoElectronico: 'ana@example.com',
  Activo: 1
}

test('password reset request stores only a token hash and sends the public URL', async () => {
  let stored: { userId: number; hash: string; expiresAt: Date } | undefined
  let mail: any
  const repo: any = {
    findByEmail: async () => activeUser,
    canIssuePasswordResetToken: async () => true,
    replacePasswordResetToken: async (userId: number, hash: string, expiresAt: Date) => {
      stored = { userId, hash, expiresAt }
    }
  }
  const mailer: any = { sendPasswordReset: async (payload: any) => { mail = payload } }
  const service = new AuthService(repo, undefined, undefined, mailer)

  await service.requestPasswordReset('ANA@example.com', 'hncami')

  assert.equal(stored?.userId, 7)
  assert.match(stored?.hash ?? '', /^[a-f0-9]{64}$/)
  const url = new URL(mail.resetUrl)
  const rawToken = url.searchParams.get('token') ?? ''
  assert.equal(url.searchParams.get('codigoEmpresa'), 'HNCAMI')
  assert.notEqual(rawToken, stored?.hash)
  assert.equal(crypto.createHash('sha256').update(rawToken).digest('hex'), stored?.hash)
})

test('password reset rejects an expired or already used token', async () => {
  const repo: any = { consumePasswordResetToken: async () => false }
  const service = new AuthService(repo)
  await assert.rejects(
    service.resetPassword('a'.repeat(64), 'new-password'),
    (err: any) => err?.name === 'validation_errors'
  )
})
