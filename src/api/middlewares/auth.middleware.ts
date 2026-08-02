import { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../../utils/jwtUtils'
import { PoolManager } from '../../infrastructure/database/PoolManager'
import { TenantContext } from '../../infrastructure/database/TenantContext'
import { and, eq, isNull } from 'drizzle-orm'
import { users } from '../../infrastructure/database/schema/tenant'

const getAuthToken = (req: Request): string | null => {
  const header = req.header('Authorization')
  if (header && header.startsWith('Bearer ')) {
    const token = header.replace('Bearer ', '').trim()
    if (token) return token
  }
  return null
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = getAuthToken(req)

  if (!token) {
    res.status(401).json({ message: 'Acceso denegado. No se proporcionó un token.' })
    return
  }

  let payload: ReturnType<typeof verifyToken>
  try {
    payload = verifyToken(token)
  } catch (err: any) {
    const expired = err?.name === 'TokenExpiredError'
    res.status(401).json({
      message: expired ? 'La sesión ha expirado. Por favor inicia sesión nuevamente.' : 'Token inválido.',
    })
    return
  }

  let pool: Awaited<ReturnType<typeof PoolManager.getPool>>['pool']
  let db: Awaited<ReturnType<typeof PoolManager.getPool>>['db']
  try {
    const result = await PoolManager.getPool(payload.codigoEmpresa)
    pool = result.pool
    db = result.db
  } catch (err: any) {
    if (err?.name === 'not_found_error' || err?.name === 'inactive_company') {
      res.status(401).json({ message: err.message })
      return
    }
    next(err)
    return
  }

  try {
    const [user] = await db
      .select({ sessionVersion: users.sessionVersion })
      .from(users)
      .where(and(eq(users.id, payload.uid), isNull(users.deletedAt)))
      .limit(1)
    if (!user || user.sessionVersion !== payload.sv) {
      res.status(401).json({ message: 'La sesión ha expirado. Por favor inicia sesión nuevamente.' })
      return
    }
  } catch (err) {
    next(err)
    return
  }

  ;(req as any).user = payload
  TenantContext.run(pool, db, () => {
    next()
    return Promise.resolve()
  })
}
