import { config } from './env'
import jwt from 'jsonwebtoken'

export const generateToken = (payload: object) => {
    return jwt.sign(payload, config.SECRET_JWT_TOKEN, { expiresIn: config.JWT_EXPIRES_IN })
}

export const verifyToken = (token: string) => {
    return jwt.verify(token, config.SECRET_JWT_TOKEN)
}