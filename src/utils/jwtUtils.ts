import jwt from 'jsonwebtoken'
import { createHash, randomUUID } from 'crypto'
import { config } from '../config/env'

export interface TokenPayload {
  uid: string
  codigoEmpresa: string
  dbName: string
  sessionStartedAt?: number
  sv: number // session version — incremented on each login to invalidate prior tokens
}

export interface PasswordResetTokenPayload {
  uid: string
  codigoEmpresa: string
  sv: number
  purpose: 'password_reset'
  exp: number
  jti: string
}

let configuredTokenSeconds: number | undefined

export const generateToken = (userId: string, codigoEmpresa: string, dbName: string, sessionVersion: number, sessionStartedAt = Math.floor(Date.now() / 1000)): string => {
  const now = Math.floor(Date.now() / 1000)
  const remaining = sessionStartedAt + 8 * 60 * 60 - now
  if (remaining <= 0) throw Object.assign(new Error('La jornada ha finalizado. Inicia sesión nuevamente.'), { name: 'TokenExpiredError' })
  // A renewable access token: at most 30 minutes, never past the original 8-hour session.
  if (configuredTokenSeconds === undefined) {
    const configured = jwt.decode(jwt.sign({}, config.SECRET_JWT_TOKEN, { expiresIn: config.JWT_EXPIRES_IN as any })) as { exp: number; iat: number }
    configuredTokenSeconds = configured.exp - configured.iat
  }
  const expiresIn = Math.min(configuredTokenSeconds, 30 * 60, remaining)
  return jwt.sign({ uid: userId, codigoEmpresa, dbName, sv: sessionVersion, sessionStartedAt }, config.SECRET_JWT_TOKEN, { expiresIn })
}

export const verifyToken = (token: string): TokenPayload => {
  const payload = jwt.verify(token, config.SECRET_JWT_TOKEN) as TokenPayload & { purpose?: unknown }
  if (payload.purpose !== undefined || typeof payload.uid !== 'string' || typeof payload.codigoEmpresa !== 'string'
    || typeof payload.dbName !== 'string' || !Number.isSafeInteger(payload.sv))
    throw Object.assign(new Error('Invalid session token.'), { name: 'JsonWebTokenError' })
  if (payload.sessionStartedAt !== undefined && (!Number.isSafeInteger(payload.sessionStartedAt)
    || payload.sessionStartedAt > Math.floor(Date.now() / 1000)
    || Math.floor(Date.now() / 1000) >= payload.sessionStartedAt + 8 * 60 * 60)) {
    throw Object.assign(new Error('Session expired.'), { name: 'TokenExpiredError' })
  }
  return payload
}

export const generatePasswordResetToken = (
  userId: string,
  codigoEmpresa: string,
  sessionVersion: number
): string => {
  return jwt.sign(
    { uid: userId, codigoEmpresa, sv: sessionVersion, purpose: 'password_reset' },
    config.SECRET_JWT_TOKEN,
    { expiresIn: config.PASSWORD_RESET_TOKEN_EXPIRES_IN as any, jwtid: randomUUID() }
  )
}

export const verifyPasswordResetToken = (token: string): PasswordResetTokenPayload => {
  const payload = jwt.verify(token, config.SECRET_JWT_TOKEN) as PasswordResetTokenPayload
  if (payload.purpose !== 'password_reset' || !payload.jti || !Number.isFinite(payload.exp) ||
      typeof payload.uid !== 'string' || typeof payload.codigoEmpresa !== 'string' || !Number.isInteger(payload.sv)) {
    throw Object.assign(new Error('Token inválido.'), { name: 'JsonWebTokenError' })
  }
  return payload
}

export const hashResetToken = (token: string): string => createHash('sha256').update(token).digest('hex')
