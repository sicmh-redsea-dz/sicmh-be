import { NextFunction, Request, Response } from 'express'
import { AuthService } from '../../application/services/auth.service'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { generateToken } from '../../utils/jwtUtils'
import { PoolManager } from '../../infrastructure/database/PoolManager'
import { TenantContext } from '../../infrastructure/database/TenantContext'

const throwValidationError = (message: string) => {
  const error: any = new Error(message)
  error.name = 'validation_errors'
  error.errors = [{ msg: message }]
  throw error
}

export class AuthController {
  private readonly authService: AuthService

  constructor() {
    this.authService = ServiceContainer.getAuthService()
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password, codigoEmpresa } = req.body ?? {}
    try {
      if (!email || !password) throwValidationError('El correo y la contraseña son obligatorios.')
      if (!codigoEmpresa) throwValidationError('El código de empresa es obligatorio.')

      const { pool, dbName } = await PoolManager.getPool(codigoEmpresa)
      const { user: registeredUser, sessionVersion } = await TenantContext.run(pool, () =>
        this.authService.register({ name, email, password })
      )
      const token = generateToken(registeredUser._id, codigoEmpresa.toUpperCase(), dbName, sessionVersion)
      res.status(202).json({ user: registeredUser, token })
    } catch (err) {
      next(err)
    }
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, codigoEmpresa } = req.body ?? {}
    try {
      if (!email || !password) throwValidationError('El correo y la contraseña son obligatorios.')
      if (!codigoEmpresa) throwValidationError('El código de empresa es obligatorio.')

      const { pool, dbName } = await PoolManager.getPool(codigoEmpresa)
      const { user: loggedUser, sessionVersion } = await TenantContext.run(pool, () =>
        this.authService.login({ email, password })
      )
      const token = generateToken(loggedUser._id, codigoEmpresa.toUpperCase(), dbName, sessionVersion)
      res.status(202).json({ user: loggedUser, token })
    } catch (err) {
      next(err)
    }
  }

  checkToken = async (req: Request, res: Response, next: NextFunction) => {
    const { uid } = (req as any).user
    try {
      const currentUser = await this.authService.checkToken(Number(uid))
      res.status(200).json({ user: currentUser })
    } catch (err) {
      next(err)
    }
  }

  completePasswordChange = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ updated: true })
    } catch (err) {
      next(err)
    }
  }
}
