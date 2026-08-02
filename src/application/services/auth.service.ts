import { AuthRepository } from '../ports/auth.repository'
import { UserProfilesRepository } from '../ports/user-profiles.repository'
import { AccessControlService } from './access-control.service'
import { hashPassword, comparePassword } from '../../utils/passwordUtils'
import { User } from '../../domain/entities/User'
import { UserMapper } from '../../domain/mappers/UserMapper'
import { AuthResponse } from '../../domain/responses/AuthResponse'

interface AuthParams {
  name?: string
  email: string
  password?: string
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
}
