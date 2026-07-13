import jwt from 'jsonwebtoken'
import { config } from '../config/env'

export interface TokenPayload {
  uid: number
  codigoEmpresa: string
  dbName: string
  sv: number // session version — incremented on each login to invalidate prior tokens
}

export const generateToken = (userId: number, codigoEmpresa: string, dbName: string, sessionVersion: number): string => {
  return jwt.sign({ uid: userId, codigoEmpresa, dbName, sv: sessionVersion }, config.SECRET_JWT_TOKEN, { expiresIn: config.JWT_EXPIRES_IN as any })
}

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.SECRET_JWT_TOKEN) as TokenPayload
}
