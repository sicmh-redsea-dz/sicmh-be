import crypto from 'crypto'
import { firebaseAdmin } from '../../config/firebase'
import { AuthRepository } from '../ports/auth.repository'
import { UserProfilesRepository } from '../ports/user-profiles.repository'
import { UserProfile } from '../../domain/entities/UserProfile'
import { AccessControlService } from './access-control.service'
import { Permission, normalizeRoleName } from '../../api/permissions/permissions'
import { UserMapper } from '../../domain/mappers/UserMapper'
import { AuthResponse } from '../../domain/responses/AuthResponse'
import { hashPassword } from '../../utils/passwordUtils'

type InvitePayload = {
  name: string
  email: string
  roleId: number
  profile?: Partial<UserProfile>
}

type ProfilePayload = {
  name?: string
  email?: string
  profile?: Partial<UserProfile>
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

export class SettingsService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly profileRepo: UserProfilesRepository,
    private readonly accessControlService: AccessControlService
  ) {}

  listRoles = async (): Promise<{ id: number; name: string; key: string }[]> => {
    let roles = await this.authRepo.listRoles()
    if (!roles.length) {
      await this.seedDefaultRoles()
      roles = await this.authRepo.listRoles()
    }
    if (!roles.length) {
      throw buildValidationError('No hay roles configurados.')
    }
    return roles.map((role) => ({
      id: role.RolID,
      name: role.NombreRol,
      key: normalizeRoleName(role.NombreRol) ?? role.NombreRol.toLowerCase()
    }))
  }

  private async seedDefaultRoles() {
    const defaults = ['Admin', 'Doctor', 'Enfermera', 'Recepcionista', 'Asistente']
    for (const name of defaults) {
      try {
        await this.authRepo.createRole(name)
      } catch (err: any) {
        if (err?.code !== 'ER_DUP_ENTRY') {
          throw err
        }
      }
    }
  }

  listUsers = async (): Promise<any[]> => {
    const users = await this.authRepo.listUsers()
    const store = await this.profileRepo.load()
    return users.map((user) => {
      const profile = store.profiles.find((p) => p.userId === user.UsuarioID)
      return {
        id: user.UsuarioID,
        name: user.NombreUsuario,
        email: user.CorreoElectronico,
        isActive: !!user.Activo,
        roleId: user.RolID,
        roleName: user.NombreRol,
        profile: profile ?? undefined
      }
    })
  }

  getProfile = async (userId: number): Promise<{ user: AuthResponse & { profile?: UserProfile } }> => {
    const user = await this.authRepo.findById(userId)
    if (!user) {
      throw buildError('not_found_error', 'User not found.')
    }
    const authUser = await UserMapper.toAuthResponse(user)
    const store = await this.profileRepo.load()
    const profile = store.profiles.find((p) => p.userId === userId)
    return {
      user: {
        ...authUser,
        profile
      }
    }
  }

  updateProfile = async (userId: number, uid: string, payload: ProfilePayload) => {
    const user = await this.authRepo.findById(userId)
    if (!user) {
      throw buildError('not_found_error', 'User not found.')
    }

    const name = payload.name?.trim() || user.NombreUsuario
    const email = payload.email?.trim() || user.CorreoElectronico

    if (!name) {
      throw buildValidationError('Nombre requerido.')
    }

    if (!email) {
      throw buildValidationError('Correo requerido.')
    }

    if (email !== user.CorreoElectronico) {
      const existing = await this.authRepo.findByEmail(email)
      if (existing && existing.UsuarioID !== userId) {
        throw buildValidationError('El correo ya está registrado.')
      }
      await firebaseAdmin.auth().updateUser(uid, { email })
    }

    if (name !== user.NombreUsuario) {
      await firebaseAdmin.auth().updateUser(uid, { displayName: name })
    }

    await this.authRepo.updateUserProfile(userId, { name, email })

    const store = await this.profileRepo.load()
    const now = new Date().toISOString()
    const existingProfile = store.profiles.find((p) => p.userId === userId)
    const updatedProfile: UserProfile = {
      userId,
      phone: payload.profile?.phone ?? existingProfile?.phone,
      identification: payload.profile?.identification ?? existingProfile?.identification,
      department: payload.profile?.department ?? existingProfile?.department,
      position: payload.profile?.position ?? existingProfile?.position,
      theme: payload.profile?.theme ?? existingProfile?.theme,
      avatarDataUrl: payload.profile?.avatarDataUrl ?? existingProfile?.avatarDataUrl,
      createdAt: existingProfile?.createdAt ?? now,
      updatedAt: now
    }

    if (existingProfile) {
      Object.assign(existingProfile, updatedProfile)
    } else {
      store.profiles.push(updatedProfile)
    }

    store.updatedAt = now
    await this.profileRepo.save(store)

    const refreshed = await this.authRepo.findById(userId)
    if (!refreshed) {
      throw buildError('not_found_error', 'User not found.')
    }

    return {
      user: {
        ...(await UserMapper.toAuthResponse(refreshed)),
        profile: updatedProfile
      }
    }
  }

  updateUserRole = async (userId: number, roleId: number) => {
    const roles = await this.listRoles()
    const roleExists = roles.some((role) => role.id === roleId)
    if (!roleExists) {
      throw buildValidationError('Rol inválido.')
    }

    await this.authRepo.updateUserRole(userId, roleId)
    return { updated: true }
  }

  getRolePermissions = async () => {
    const [roles, overrides] = await Promise.all([
      this.listRoles(),
      this.accessControlService.getRoleOverrides()
    ])

    return {
      roles,
      permissions: this.accessControlService.listAllPermissions(),
      overrides
    }
  }

  updateRolePermissions = async (roleKey: string, grants: Permission[], revokes: Permission[]) => {
    const updated = await this.accessControlService.updateRoleOverride(roleKey, grants, revokes)
    return { roleKey, override: updated }
  }

  getUserPermissions = async () => {
    const [users, overrides] = await Promise.all([
      this.listUsers(),
      this.accessControlService.getUserOverrides()
    ])

    return {
      users,
      permissions: this.accessControlService.listAllPermissions(),
      overrides
    }
  }

  updateUserPermissions = async (userId: number, grants: Permission[], revokes: Permission[]) => {
    const updated = await this.accessControlService.updateUserOverride(userId, grants, revokes)
    return { userId, override: updated }
  }

  inviteUser = async (payload: InvitePayload) => {
    const name = payload.name?.trim()
    const email = payload.email?.trim().toLowerCase()
    const roleId = payload.roleId

    if (!name || !email) {
      throw buildValidationError('Nombre y correo son requeridos.')
    }
    if (!roleId) {
      throw buildValidationError('Rol requerido.')
    }

    const existingByEmail = await this.authRepo.findByEmail(email)
    if (existingByEmail) {
      throw buildValidationError('El correo ya está registrado.')
    }

    try {
      await firebaseAdmin.auth().getUserByEmail(email)
      throw buildValidationError('El correo ya está registrado en Firebase.')
    } catch (err: any) {
      if (err?.code !== 'auth/user-not-found') {
        throw err
      }
    }

    const roles = await this.listRoles()
    const roleExists = roles.some((role) => role.id === roleId)
    if (!roleExists) {
      throw buildValidationError('Rol inválido.')
    }

    const tempPassword = this.generateTempPassword()

    let fbUser
    try {
      fbUser = await firebaseAdmin.auth().createUser({
        email,
        password: tempPassword,
        displayName: name
      })
    } catch (err: any) {
      throw this.mapFirebaseError(err)
    }

    let userId: number
    try {
      const passwordHash = await hashPassword(fbUser.uid)
      userId = await this.authRepo.createUser({
        name,
        email,
        passwordHash,
        roleId,
        active: 1,
        firebaseId: fbUser.uid,
        provider: 'conventional'
      })
    } catch (err: any) {
      await firebaseAdmin.auth().deleteUser(fbUser.uid).catch(() => undefined)
      if (err?.code === 'ER_NO_REFERENCED_ROW_2' || err?.code === 'ER_NO_REFERENCED_ROW') {
        throw buildValidationError('Rol inválido.')
      }
      if (err?.code === 'ER_DUP_ENTRY') {
        throw buildValidationError('El correo ya está registrado.')
      }
      throw err
    }

    try {
      await firebaseAdmin.auth().setCustomUserClaims(fbUser.uid, {
        mustChangePassword: true
      })
    } catch (err: any) {
      await firebaseAdmin.auth().deleteUser(fbUser.uid).catch(() => undefined)
      throw this.mapFirebaseError(err)
    }

    if (payload.profile) {
      const store = await this.profileRepo.load()
      const now = new Date().toISOString()
      store.profiles.push({
        userId,
        phone: payload.profile.phone,
        identification: payload.profile.identification,
        department: payload.profile.department,
        position: payload.profile.position,
        theme: payload.profile.theme ?? 'light',
        avatarDataUrl: payload.profile.avatarDataUrl,
        createdAt: now,
        updatedAt: now
      })
      store.updatedAt = now
      await this.profileRepo.save(store)
    }

    const emailSent = await this.sendInviteEmail({ name, email, tempPassword })

    return {
      userId,
      emailSent,
      tempPassword: emailSent ? undefined : tempPassword
    }
  }

  clearPasswordChangeFlag = async (uid: string) => {
    const existing = await firebaseAdmin.auth().getUser(uid)
    const claims = existing.customClaims ?? {}
    await firebaseAdmin.auth().setCustomUserClaims(uid, {
      ...claims,
      mustChangePassword: false
    })
    return { updated: true }
  }

  private mapFirebaseError(err: any) {
    const code = err?.code || err?.errorInfo?.code
    const message = String(err?.message || '').toLowerCase()
    if (code == 'app/invalid-credential' || message.includes('invalid_grant') || message.includes('jwt')) {
      return buildValidationError('Credenciales de Firebase inválidas. Revisa la hora del servidor o genera una nueva llave.')
    }
    return err
  }

  private generateTempPassword() {
    const length = 12
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*'
    let result = ''
    const bytes = crypto.randomBytes(length)
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length]
    }
    return result
  }

  private async sendInviteEmail(payload: { name: string; email: string; tempPassword: string }) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      console.warn('SMTP not configured. Invite email skipped.')
      return false
    }

    const nodemailer = await import('nodemailer')
    const mailer = (nodemailer as any).default ?? nodemailer
    const transporter = mailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    })

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Bienvenido/a, ${payload.name}</h2>
        <p>Tu cuenta ha sido creada en el sistema clínico.</p>
        <p><strong>Correo:</strong> ${payload.email}</p>
        <p><strong>Contraseña temporal:</strong> ${payload.tempPassword}</p>
        <p>Al iniciar sesión por primera vez deberás cambiar tu contraseña.</p>
      </div>
    `

    await transporter.sendMail({
      from: SMTP_FROM,
      to: payload.email,
      subject: 'Acceso al sistema clínico',
      html
    })

    return true
  }
}
