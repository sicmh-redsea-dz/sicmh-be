import { AuthRepository } from '../ports/auth.repository'
import { UserProfilesRepository } from '../ports/user-profiles.repository'
import { AccessControlService } from './access-control.service'
import { hashPassword, comparePassword } from '../../utils/passwordUtils'
import { User } from '../../domain/entities/User'
import { UserMapper } from '../../domain/mappers/UserMapper'
import { AuthResponse } from '../../domain/responses/AuthResponse'
import { config } from '../../config/env'
import { generatePasswordResetToken, verifyPasswordResetToken } from '../../utils/jwtUtils'

interface AuthParams {
  name?: string
  email: string
  password?: string
}

interface PasswordResetRequestParams {
  email: string
  codigoEmpresa: string
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
    private readonly accessControlService?: AccessControlService
  ) {}

  register = async (params: AuthParams): Promise<{ user: AuthResponse; sessionVersion: number }> => {
    const { name, email, password } = params

    if (!password) throw buildValidationError('Password is required.')

    const existingByEmail = await this.authRepo.findByEmail(email)
    if (existingByEmail) throw buildError('duplicate_entry', 'Email already registered.')

    const passwordHash = await hashPassword(password)
    const finalName = name?.trim() || (email.includes('@') ? email.split('@')[0] : email)

    const existingUserCount = await this.authRepo.countUsers()
    const roles = await this.authRepo.listRoles()
    const roleName = existingUserCount === 0 ? 'admin' : 'asistente'
    const selectedRole = roles.find((role) =>
      String(role.NombreRol ?? '').trim().toLowerCase() === roleName
    )
    if (!selectedRole?.RolID) throw buildValidationError(`Role ${roleName} is not configured.`)

    const insertId = await this.authRepo.createUser({
      name: finalName,
      email,
      passwordHash,
      roleId: String(selectedRole.RolID),
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

  checkToken = async (id: string): Promise<AuthResponse> => {
    const user = await this.authRepo.findById(id)
    if (!user) throw buildError('not_found_error', 'User not found.')
    if (!user.Activo) throw buildError('inactive_user', 'User is inactive.')
    const response = await UserMapper.toAuthResponse(user)
    return await this.attachProfile(response)
  }

  requestPasswordReset = async (params: PasswordResetRequestParams): Promise<{ message: string }> => {
    const email = params.email.trim().toLowerCase()
    const genericMessage = 'Si el correo existe, recibirás instrucciones para restablecer la contraseña.'
    const user = await this.authRepo.findByEmail(email)
    if (!user?.UsuarioID || !user.Activo) return { message: genericMessage }

    const token = generatePasswordResetToken(user.UsuarioID, params.codigoEmpresa.toUpperCase(), user.SessionVersion ?? 0)
    const resetUrl = this.buildResetUrl(token, params.codigoEmpresa)
    const emailSent = await this.sendPasswordResetEmail({
      email,
      name: user.NombreUsuario,
      resetUrl,
    })

    if (emailSent) return { message: genericMessage }
    return { message: `SMTP no configurado. Usa este enlace temporal: ${resetUrl}` }
  }

  resetPassword = async (token: string, newPassword: string, codigoEmpresa: string): Promise<{ message: string }> => {
    if (!newPassword || newPassword.length < 8) {
      throw buildValidationError('La contraseña debe tener al menos 8 caracteres.')
    }

    let payload
    try {
      payload = verifyPasswordResetToken(token)
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError') {
        throw buildValidationError('El enlace de restablecimiento expiró.')
      }
      throw buildValidationError('El enlace de restablecimiento no es válido.')
    }

    if (payload.codigoEmpresa !== codigoEmpresa.toUpperCase()) {
      throw buildValidationError('El enlace no corresponde a la empresa indicada.')
    }

    const user = await this.authRepo.findById(payload.uid)
    if (!user || !user.Activo) throw buildValidationError('No se encontró una cuenta válida para restablecer la contraseña.')
    if ((user.SessionVersion ?? 0) !== payload.sv) {
      throw buildValidationError('El enlace de restablecimiento ya no es válido. Solicita uno nuevo.')
    }

    const passwordHash = await hashPassword(newPassword)
    await this.authRepo.changeUserPassword(user.UsuarioID, passwordHash)
    await this.authRepo.incrementSessionVersion(user.UsuarioID, user.SessionVersion)
    return { message: 'La contraseña fue actualizada correctamente.' }
  }

  completePasswordChange = async (
    userId: string,
    newPassword: string
  ): Promise<{ user: AuthResponse; sessionVersion: number }> => {
    if (!newPassword || newPassword.length < 8) {
      throw buildValidationError('La contraseña debe tener al menos 8 caracteres.')
    }

    const user = await this.authRepo.findById(userId)
    if (!user) throw buildError('not_found_error', 'User not found.')
    if (!user.Activo) throw buildError('inactive_user', 'User is inactive.')

    const passwordHash = await hashPassword(newPassword)
    await this.authRepo.changeUserPassword(userId, passwordHash)
    const sessionVersion = await this.authRepo.incrementSessionVersion(userId, user.SessionVersion)

    const refreshed = await this.authRepo.findById(userId)
    if (!refreshed) throw buildError('not_found_error', 'User not found.')
    const response = await UserMapper.toAuthResponse(refreshed)
    return { user: await this.attachProfile(response), sessionVersion }
  }

  private getUserData = async (identifier: string): Promise<User> => {
    const user = identifier.includes('@')
      ? await this.authRepo.findByEmail(identifier)
      : await this.authRepo.findById(identifier)

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

  private buildResetUrl(token: string, codigoEmpresa: string): string {
    const query = `token=${encodeURIComponent(token)}&codigoEmpresa=${encodeURIComponent(codigoEmpresa.toUpperCase())}`
    const baseUrl = config.PUBLIC_BASE_URL.trim().replace(/\/+$/, '')
    return baseUrl
      ? `${baseUrl}/auth/reset-password?${query}`
      : `/auth/reset-password?${query}`
  }

  private async sendPasswordResetEmail(payload: { email: string; name: string; resetUrl: string }) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      console.warn('SMTP not configured. Password reset email skipped.')
      return false
    }

    const nodemailer = await import('nodemailer')
    const mailer = (nodemailer as any).default ?? nodemailer
    const transporter = mailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    })

    await transporter.sendMail({
      from: SMTP_FROM,
      to: payload.email,
      subject: 'Restablecimiento de contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Hola, ${payload.name}</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p><a href="${payload.resetUrl}">Haz clic aquí para crear una nueva contraseña</a></p>
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
      `
    })

    return true
  }
}
