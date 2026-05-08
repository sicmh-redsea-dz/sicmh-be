import { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../../utils/jwtUtils'

const getAuthToken = (req: Request): string | null => {
  const header = req.header('Authorization')
  if (header && header.startsWith('Bearer ')) {
    const token = header.replace('Bearer ', '').trim()
    if (token) return token
  }
  return null
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = getAuthToken(req)

  if (!token) {
    res.status(401).json({ message: 'Access denied. No token provided.' })
    return
  }

  try {
    const payload = verifyToken(token)
    ;(req as any).user = payload
    next()
  } catch (err: any) {
    const expired = err?.name === 'TokenExpiredError'
    res.status(401).json({
      message: expired ? 'Token expired. Please login again.' : 'Invalid token.',
    })
  }
}
