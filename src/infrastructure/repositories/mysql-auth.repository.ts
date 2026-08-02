import { and, count, eq, isNull, SQL, sql } from 'drizzle-orm'
import { AuthCreateUserParams, AuthRepository, PersonalCreateParams } from '../../application/ports/auth.repository'
import { User } from '../../domain/entities/User'
import { TenantContext } from '../database/TenantContext'
import { roles, staffMembers, users } from '../database/schema/tenant'

const toUser = (row: {
  user: typeof users.$inferSelect
  role: typeof roles.$inferSelect
}): User => ({
  UsuarioID: row.user.id,
  NombreUsuario: row.user.name,
  CorreoElectronico: row.user.email,
  ContrasenaHash: row.user.passwordHash ?? undefined,
  Activo: row.user.isActive ? 1 : 0,
  NombreRol: row.role.name,
  firebaseID: row.user.firebaseId ?? '',
  SessionVersion: row.user.sessionVersion,
})

export class MysqlAuthRepository implements AuthRepository {
  async createUser(params: AuthCreateUserParams): Promise<string> {
    const [created] = await TenantContext.getDb()
      .insert(users)
      .values({
        name: params.name,
        email: params.email,
        passwordHash: params.passwordHash,
        roleId: params.roleId,
        isActive: Boolean(params.active),
        firebaseId: params.firebaseId || null,
        provider: params.provider,
        accessToken: params.accessToken,
      })
      .$returningId()
    return created.id
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne(eq(users.email, email))
  }

  async findById(id: string): Promise<User | null> {
    return this.findOne(eq(users.id, id))
  }

  async findByFirebaseId(uid: string): Promise<User | null> {
    return this.findOne(eq(users.firebaseId, uid))
  }

  async countUsers(): Promise<number> {
    const [result] = await TenantContext.getDb()
      .select({ total: count() })
      .from(users)
      .where(isNull(users.deletedAt))
    return result?.total ?? 0
  }

  async listUsers(): Promise<Array<Record<string, unknown>>> {
    const rows = await TenantContext.getDb()
      .select({ user: users, role: roles })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(isNull(users.deletedAt), isNull(roles.deletedAt)))
    return rows.map(({ user, role }) => ({
      UsuarioID: user.id,
      NombreUsuario: user.name,
      CorreoElectronico: user.email,
      Activo: user.isActive ? 1 : 0,
      RolID: role.id,
      NombreRol: role.name,
    }))
  }

  async listRoles(): Promise<Array<Record<string, unknown>>> {
    const rows = await TenantContext.getDb().select().from(roles).where(isNull(roles.deletedAt))
    return rows.map((role) => ({ RolID: role.id, NombreRol: role.name }))
  }

  async createRole(name: string): Promise<string> {
    const [created] = await TenantContext.getDb()
      .insert(roles)
      .values({ name, key: name.trim().toLowerCase() })
      .$returningId()
    return created.id
  }

  async updateUserRole(userId: string, roleId: string): Promise<void> {
    await TenantContext.getDb().update(users).set({ roleId }).where(and(eq(users.id, userId), isNull(users.deletedAt)))
  }

  async updateUserProfile(userId: string, payload: { name: string; email: string }): Promise<void> {
    await TenantContext.getDb()
      .update(users)
      .set({ name: payload.name, email: payload.email })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
  }

  async deleteUser(userId: string): Promise<void> {
    await TenantContext.getDb()
      .update(users)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
  }

  async changeUserPassword(userId: string, passwordHash: string): Promise<void> {
    await TenantContext.getDb()
      .update(users)
      .set({ passwordHash })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
  }

  async createPersonalRecord(params: PersonalCreateParams): Promise<string> {
    const [created] = await TenantContext.getDb()
      .insert(staffMembers)
      .values({
        firstName: params.nombre,
        lastName: params.apellido,
        position: params.cargo,
        phone: params.telefono,
        email: params.correoElectronico,
        specialty: params.especialidad,
        userId: params.usuarioId,
        googleCalendarId: params.gCalCalendarId,
        hiredAt: new Date(),
      })
      .$returningId()
    return created.id
  }

  async getSessionVersion(userId: string): Promise<number> {
    const [result] = await TenantContext.getDb()
      .select({ sessionVersion: users.sessionVersion })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1)
    return result?.sessionVersion ?? 0
  }

  async incrementSessionVersion(userId: string, currentVersion?: number): Promise<number> {
    if (currentVersion !== undefined) {
      const sessionVersion = currentVersion + 1
      await TenantContext.getDb().update(users).set({ sessionVersion }).where(eq(users.id, userId))
      return sessionVersion
    }
    await TenantContext.getDb()
      .update(users)
      .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
      .where(eq(users.id, userId))
    return this.getSessionVersion(userId)
  }

  private async findOne(condition: SQL): Promise<User | null> {
    const [row] = await TenantContext.getDb()
      .select({ user: users, role: roles })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(condition, isNull(users.deletedAt), isNull(roles.deletedAt)))
      .limit(1)
    return row ? toUser(row) : null
  }
}
