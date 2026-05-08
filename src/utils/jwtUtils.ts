import jwt from 'jsonwebtoken'
import { config } from '../config/env'

export const generateToken = (userId: number): string => {
  return jwt.sign({ uid: userId }, config.SECRET_JWT_TOKEN, { expiresIn: config.JWT_EXPIRES_IN as any })
}

export const verifyToken = (token: string): { uid: number } => {
  return jwt.verify(token, config.SECRET_JWT_TOKEN) as { uid: number }
}
