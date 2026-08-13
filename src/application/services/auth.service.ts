import crypto from 'crypto'
import { AuthRepository } from '../ports/auth.repository'
import { MailService } from '../ports/mail.service'
import { UserProfilesRepository } from '../ports/user-profiles.repository'
import { AccessControlService } from './access-control.service'
import { hashPassword, comparePassword } from '../../utils/passwordUtils'
import { User } from '../../domain/entities/User'
import { UserMapper } from '../../domain/mappers/UserMapper'
import { AuthResponse } from '../../domain/responses/AuthResponse'
import { config } from '../../config/env'

interface AuthParams {
  name?: string
  email: string
  password?: string
}

enum Roles {
  Admin = 6,
  Doctor = 2,
  Enfermera = 3,
  Recepcionista = 4,
  Asistente = 5,
}

const buildError = (name: string, message: string) => {
  const error: any = new Error(message)
  error.name = name
  return error
}

const buildValidationError = (message: string) => {
  const error: any = new Error(message)
  error.name = 'validation_errors'
  error.errors = [{ msg: message }]
  return error
}

export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly profileRepo?: UserProfilesRepository,
    private readonly accessControlService?: AccessControlService,
    private readonly mailService?: MailService
  ) {}

  register = async (params: AuthParams): Promise<{ user: AuthResponse; sessionVersion: number }> => {
    const { name, email, password } = params

    if (!password) throw buildValidationError('Password is required.')

    const existingByEmail = await this.authRepo.findByEmail(email)
    if (existingByEmail) throw buildError('duplicate_entry', 'Email already registered.')

    const passwordHash = await hashPassword(password)
    const finalName = name?.trim() || (email.includes('@') ? email.split('@')[0] : email)

    const existingUserCount = await this.authRepo.countUsers()
    const roleId = existingUserCount === 0 ? Roles.Admin : Roles.Asistente

    const insertId = await this.authRepo.createUser({
      name: finalName,
      email,
      passwordHash,
      roleId,
      active: 1,
      firebaseId: email,
      provider: 'conventional',
    })

    const sessionVersion = await this.authRepo.incrementSessionVersion(insertId)
    const newUser = await this.getUserData(insertId)
    const response = await UserMapper.toAuthResponse(newUser)
    return { user: await this.attachProfile(response), sessionVersion }
  }

  login = async (params: AuthParams): Promise<{ user: AuthResponse; sessionVersion: number }> => {
    const { email, password } = params

    const existingUser = await this.authRepo.findByEmail(email)
    if (!existingUser || !existingUser.ContrasenaHash) throw buildValidationError('Credenciales incorrectas.')
    if (!existingUser.Activo) throw buildError('inactive_user', 'El usuario está inactivo.')

    const passwordMatch = await comparePassword(password!, existingUser.ContrasenaHash)
    if (!passwordMatch) throw buildValidationError('Credenciales incorrectas.')

    const sessionVersion = await this.authRepo.incrementSessionVersion(existingUser.UsuarioID, existingUser.SessionVersion)
    const response = await UserMapper.toAuthResponse(existingUser)
    return { user: await this.attachProfile(response), sessionVersion }
  }

  checkToken = async (id: number): Promise<AuthResponse> => {
    const user = await this.authRepo.findById(id)
    if (!user) throw buildError('not_found_error', 'User not found.')
    if (!user.Activo) throw buildError('inactive_user', 'User is inactive.')
    const response = await UserMapper.toAuthResponse(user)
    return await this.attachProfile(response)
  }

  requestPasswordReset = async (email: string, companyCode: string): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase()
    const user = await this.authRepo.findByEmail(normalizedEmail)
    if (!user || !user.Activo || !this.mailService) return
    if (!(await this.authRepo.canIssuePasswordResetToken(user.UsuarioID))) return

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    await this.authRepo.replacePasswordResetToken(user.UsuarioID, tokenHash, expiresAt)

    const resetUrl = new URL('/auth/reset-password', config.FRONTEND_URL)
    resetUrl.searchParams.set('token', token)
    resetUrl.searchParams.set('codigoEmpresa', companyCode.toUpperCase())
    await this.mailService.sendPasswordReset({
      name: user.NombreUsuario,
      email: user.CorreoElectronico,
      resetUrl: resetUrl.toString()
    })
  }

  resetPassword = async (token: string, newPassword: string): Promise<void> => {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const passwordHash = await hashPassword(newPassword)
    const changed = await this.authRepo.consumePasswordResetToken(tokenHash, passwordHash)
    if (!changed) throw buildValidationError('El enlace es inválido, ya fue utilizado o ha vencido.')
  }

  private getUserData = async (identifier: number | string): Promise<User> => {
    const user = typeof identifier === 'number'
      ? await this.authRepo.findById(identifier)
      : await this.authRepo.findByEmail(identifier)

    if (!user) throw buildError('not_found_error', 'User not found.')
    return user
  }

  private async attachProfile(response: AuthResponse): Promise<AuthResponse> {
    let next = { ...response }

    // Independent of each other (both only need the base response), so run
    // them concurrently instead of serializing two separate DB round-trips.
    const [profileResult, permissionsResult] = await Promise.allSettled([
      this.profileRepo?.load(),
      this.accessControlService?.resolvePermissions(response.roles ?? [], response._id)
    ])

    if (profileResult.status === 'fulfilled' && profileResult.value) {
      const profile = profileResult.value.profiles.find((p) => p.userId === response._id)
      if (profile) next = { ...next, profile }
    }

    if (permissionsResult.status === 'fulfilled' && permissionsResult.value) {
      next = { ...next, permissions: Array.from(permissionsResult.value) }
    }

    return next
  }
}
