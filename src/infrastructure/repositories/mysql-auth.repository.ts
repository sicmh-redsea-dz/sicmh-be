import { ResultSetHeader } from 'mysql2'
import { AuthCreateUserParams, AuthRepository, PasswordResetToken, PersonalCreateParams } from '../../application/ports/auth.repository'
import { User } from '../../domain/entities/User'
import { Database } from '../database/Database'
import { authQueries } from '../database/queries/auth.queries'

export class MysqlAuthRepository implements AuthRepository {
    async createUser(params: AuthCreateUserParams): Promise<number> {
        const { name, email, passwordHash, roleId, active, firebaseId, provider, accessToken } = params
        const queryKey = provider === 'google' ? 'g-register' : 'register'
        const query = authQueries(queryKey)
        const values = provider === 'google'
            ? [name, email, roleId, active, firebaseId, provider, accessToken]
            : [name, email, passwordHash, roleId, active, firebaseId, provider]
        const result = await Database.execute<ResultSetHeader>(query, values)
        return result.insertId
    }

    async findByEmail(email: string): Promise<User | null> {
        const query = authQueries('get-user', 1)
        const result = await Database.execute<User[]>(query, [email])
        return result[0] ?? null
    }

    async findById(id: number): Promise<User | null> {
        const query = authQueries('get-user', 2)
        const result = await Database.execute<User[]>(query, [id])
        return result[0] ?? null
    }

    async findByFirebaseId(uid: string): Promise<User | null> {
        const query = authQueries('check-user')
        const result = await Database.execute<User[]>(query, [uid])
        return result[0] ?? null
    }

    async countUsers(): Promise<number> {
        const query = authQueries('count-users')
        const result = await Database.execute<{ total: number }[]>(query)
        return result[0]?.total ?? 0
    }

    async listUsers(): Promise<any[]> {
        const query = authQueries('list-users')
        return Database.execute<any[]>(query)
    }

    async listRoles(): Promise<any[]> {
        const query = authQueries('list-roles')
        return Database.execute<any[]>(query)
    }

    async createRole(name: string): Promise<number> {
        const query = authQueries('insert-role')
        const result = await Database.execute<ResultSetHeader>(query, [name])
        return result.insertId
    }

    async updateUserRole(userId: number, roleId: number): Promise<void> {
        const query = authQueries('update-role')
        await Database.execute(query, [roleId, userId])
    }

    async updateUserProfile(userId: number, payload: { name: string; email: string }): Promise<void> {
        const query = authQueries('update-profile')
        await Database.execute(query, [payload.name, payload.email, userId])
    }

    async getPersonalProfile(userId: number): Promise<any | null> {
        const rows = await Database.execute<any[]>(authQueries('get-personal-profile'), [userId])
        return rows[0] ?? null
    }

    async updatePersonalProfile(userId: number, payload: { name: string; email: string; phone?: string; address?: string; department?: string; position?: string }): Promise<void> {
        const parts = payload.name.trim().split(/\s+/)
        const nombre = parts.shift() || payload.name
        const apellido = parts.join(' ')
        await Database.execute(authQueries('update-personal-profile'), [
            nombre, apellido, payload.phone ?? null, payload.email,
            payload.address ?? null, payload.department ?? null,
            payload.position ?? null, userId
        ])
    }

    async deleteUser(userId: number): Promise<void> {
        const query = authQueries('delete-user')
        await Database.execute(query, [userId])
    }

    async changeUserPassword(userId: number, passwordHash: string): Promise<void> {
        const query = authQueries('change-password')
        await Database.execute(query, [passwordHash, userId])
    }

    async createPersonalRecord(params: PersonalCreateParams): Promise<number> {
        const query = authQueries('insert-personal')
        const today = new Date().toISOString().split('T')[0]
        const values = [
            params.nombre,
            params.apellido,
            params.cargo ?? null,
            params.telefono ?? null,
            params.direccion ?? null,
            params.correoElectronico ?? null,
            today,
            params.especialidad ?? null,
            params.usuarioId,
            params.gCalCalendarId ?? null
        ]
        const result = await Database.execute<ResultSetHeader>(query, values)
        return result.insertId
    }

    async getSessionVersion(userId: number): Promise<number> {
        const query = authQueries('get-session-version')
        const result = await Database.execute<{ SessionVersion: number }[]>(query, [userId])
        return result[0]?.SessionVersion ?? 0
    }

    async incrementSessionVersion(userId: number, currentVersion?: number): Promise<number> {
        if (currentVersion !== undefined) {
            const newVersion = currentVersion + 1
            await Database.execute(authQueries('set-session-version'), [newVersion, userId])
            return newVersion
        }
        await Database.execute(authQueries('increment-session-version'), [userId])
        return this.getSessionVersion(userId)
    }

    async canIssuePasswordResetToken(userId: number): Promise<boolean> {
        const rows = await Database.execute<{ id: number }[]>(authQueries('recent-password-reset-token'), [userId])
        return rows.length === 0
    }

    async replacePasswordResetToken(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
        await Database.transaction(async () => {
            await Database.execute(authQueries('invalidate-password-reset-tokens'), [userId])
            await Database.execute(authQueries('insert-password-reset-token'), [userId, tokenHash, expiresAt])
        })
    }

    async consumePasswordResetToken(tokenHash: string, passwordHash: string): Promise<boolean> {
        return Database.transaction(async () => {
            const rows = await Database.execute<PasswordResetToken[]>(authQueries('lock-password-reset-token'), [tokenHash])
            const token = rows[0]
            if (!token) return false

            await Database.execute(authQueries('change-password'), [passwordHash, token.userId])
            await Database.execute(authQueries('increment-session-version'), [token.userId])
            await Database.execute(authQueries('consume-password-reset-token'), [token.id])
            await Database.execute(authQueries('invalidate-password-reset-tokens'), [token.userId])
            return true
        })
    }
}
