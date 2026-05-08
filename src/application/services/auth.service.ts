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
    private readonly accessControlService?: AccessControlService
  ) {}

  register = async (params: AuthParams): Promise<AuthResponse> => {
    const { name, email, password } = params

    if (!password) throw buildValidationError('Password is required.')

    const existingByEmail = await this.authRepo.findByEmail(email)
    if (existingByEmail) throw buildError('duplicate_entry', 'Email already registered.')

    const passwordHash = await hashPassword(password)
    const finalName = name?.trim() || (email.includes('@') ? email.split('@')[0] : email)

    const insertId = await this.authRepo.createUser({
      name: finalName,
      email,
      passwordHash,
      roleId: Roles.Admin,
      active: 1,
      firebaseId: email,
      provider: 'conventional',
    })

    const newUser = await this.getUserData(insertId)
    const response = await UserMapper.toAuthResponse(newUser)
    return await this.attachProfile(response)
  }

  login = async (params: AuthParams): Promise<AuthResponse> => {
    const { email, password } = params

    const existingUser = await this.authRepo.findByEmail(email)
    if (!existingUser) throw buildError('not_found_error', 'User not found.')
    if (!existingUser.Activo) throw buildError('inactive_user', 'User is inactive.')
    if (!existingUser.ContrasenaHash) throw buildValidationError('This account does not support password login.')

    const passwordMatch = await comparePassword(password!, existingUser.ContrasenaHash)
    if (!passwordMatch) throw buildValidationError('Invalid credentials.')

    const response = await UserMapper.toAuthResponse(existingUser)
    return await this.attachProfile(response)
  }

  checkToken = async (id: number): Promise<AuthResponse> => {
    const user = await this.authRepo.findById(id)
    if (!user) throw buildError('not_found_error', 'User not found.')
    if (!user.Activo) throw buildError('inactive_user', 'User is inactive.')
    const response = await UserMapper.toAuthResponse(user)
    return await this.attachProfile(response)
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

    if (this.profileRepo) {
      try {
        const store = await this.profileRepo.load()
        const profile = store.profiles.find((p) => p.userId === response._id)
        if (profile) next = { ...next, profile }
      } catch (_err) {}
    }

    if (this.accessControlService) {
      try {
        const permissions = await this.accessControlService.resolvePermissions(next.roles ?? [], next._id)
        next = { ...next, permissions: Array.from(permissions) }
      } catch (_err) {}
    }

    return next
  }
}
