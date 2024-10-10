import { Request, Response, NextFunction } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import * as dotenv from 'dotenv'

dotenv.config()

const secretJwtToken = process.env.SECRET_JWT_TOKEN || '';

export const authenticateJwt = ( req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.split(' ')[1]
  if( !token ) res.status(403).json({message: 'No bearer token found'})
  jwt.verify(token!, secretJwtToken, ( err, decoded ) => {
    if( err ) {
      res.status(403).json({message: 'Invalid bearer token'})
      return
    }
    (req as any).user = decoded
    next()
  })
}