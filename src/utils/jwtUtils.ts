import jwt from 'jsonwebtoken'
import { config } from '../config/env'

export interface TokenPayload {
  uid: string
  codigoEmpresa: string
  dbName: string
  sv: number // session version — incremented on each login to invalidate prior tokens
}

export interface PasswordResetTokenPayload {
  uid: string
  codigoEmpresa: string
  sv: number
  purpose: 'password_reset'
}

export const generateToken = (userId: string, codigoEmpresa: string, dbName: string, sessionVersion: number): string => {
  return jwt.sign({ uid: userId, codigoEmpresa, dbName, sv: sessionVersion }, config.SECRET_JWT_TOKEN, { expiresIn: config.JWT_EXPIRES_IN as any })
}

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.SECRET_JWT_TOKEN) as TokenPayload
}

export const generatePasswordResetToken = (
  userId: string,
  codigoEmpresa: string,
  sessionVersion: number
): string => {
  return jwt.sign(
    { uid: userId, codigoEmpresa, sv: sessionVersion, purpose: 'password_reset' },
    config.SECRET_JWT_TOKEN,
    { expiresIn: config.PASSWORD_RESET_TOKEN_EXPIRES_IN as any }
  )
}

export const verifyPasswordResetToken = (token: string): PasswordResetTokenPayload => {
  const payload = jwt.verify(token, config.SECRET_JWT_TOKEN) as PasswordResetTokenPayload
  if (payload.purpose !== 'password_reset') {
    throw Object.assign(new Error('Token inválido.'), { name: 'JsonWebTokenError' })
  }
  return payload
}
