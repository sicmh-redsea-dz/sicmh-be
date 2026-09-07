import { Request } from 'express'
import { AuthService } from '../../application/services/auth.service'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { generateToken } from '../../utils/jwtUtils'
import { PoolManager } from '../../infrastructure/database/PoolManager'
import { TenantContext } from '../../infrastructure/database/TenantContext'
import { asyncHandler } from '../decorators/asyncHandler'

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

  @asyncHandler({ mode: 'payload', statusCode: 202 })
  async register(req: Request): Promise<any> {
    const { name, email, password, codigoEmpresa } = req.body ?? {}
    if (!email || !password) throwValidationError('El correo y la contraseña son obligatorios.')
    if (!codigoEmpresa) throwValidationError('El código de empresa es obligatorio.')

    const { pool, db, dbName } = await PoolManager.getPool(codigoEmpresa)
    const { user: registeredUser, sessionVersion } = await TenantContext.run(pool, db, () =>
      this.authService.register({ name, email, password })
    )
    const token = generateToken(registeredUser._id, codigoEmpresa.toUpperCase(), dbName, sessionVersion)
    return { user: registeredUser, token }
  }

  @asyncHandler({ mode: 'payload', statusCode: 202 })
  async login(req: Request): Promise<any> {
    const { email, password, codigoEmpresa } = req.body ?? {}
    if (!email || !password) throwValidationError('El correo y la contraseña son obligatorios.')
    if (!codigoEmpresa) throwValidationError('El código de empresa es obligatorio.')

    const { pool, db, dbName } = await PoolManager.getPool(codigoEmpresa)
    const { user: loggedUser, sessionVersion } = await TenantContext.run(pool, db, () =>
      this.authService.login({ email, password })
    )
    const token = generateToken(loggedUser._id, codigoEmpresa.toUpperCase(), dbName, sessionVersion)
    return { user: loggedUser, token }
  }

  @asyncHandler({ mode: 'payload' })
  async forgotPassword(req: Request): Promise<any> {
    const { email, codigoEmpresa } = req.body ?? {}
    if (!email) throwValidationError('El correo es obligatorio.')
    if (!codigoEmpresa) throwValidationError('El código de empresa es obligatorio.')

    const { pool, db } = await PoolManager.getPool(codigoEmpresa)
    return TenantContext.run(pool, db, () =>
      this.authService.requestPasswordReset({ email, codigoEmpresa })
    )
  }

  @asyncHandler({ mode: 'payload' })
  async resetPassword(req: Request): Promise<any> {
    const { token, newPassword, codigoEmpresa } = req.body ?? {}
    if (!token) throwValidationError('El token es obligatorio.')
    if (!newPassword) throwValidationError('La contraseña es obligatoria.')
    if (!codigoEmpresa) throwValidationError('El código de empresa es obligatorio.')

    const { pool, db } = await PoolManager.getPool(codigoEmpresa)
    return TenantContext.run(pool, db, () =>
      this.authService.resetPassword(String(token), String(newPassword), String(codigoEmpresa))
    )
  }

  @asyncHandler({ mode: 'payload' })
  async checkToken(req: Request): Promise<any> {
    const { uid } = (req as any).user
    const currentUser = await this.authService.checkToken(String(uid))
    return { user: currentUser }
  }

  @asyncHandler({ mode: 'payload' })
  async completePasswordChange(req: Request): Promise<any> {
    const reqUser = (req as any).user
    const { newPassword } = req.body ?? {}
    if (!newPassword) throwValidationError('La contraseña es obligatoria.')

    const { user, sessionVersion } = await this.authService.completePasswordChange(String(reqUser.uid), String(newPassword))
    const token = generateToken(user._id, reqUser.codigoEmpresa, reqUser.dbName, sessionVersion)
    return { updated: true, user, token }
  }
}
