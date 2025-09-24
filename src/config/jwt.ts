import { config } from './env'
import jwt from 'jsonwebtoken'


export const verifyToken = (token: string) => {
    return jwt.verify(token, config.SECRET_JWT_TOKEN)
}