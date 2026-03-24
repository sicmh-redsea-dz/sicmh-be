import { ResultSetHeader } from 'mysql2'
import { AuthCreateUserParams, AuthRepository } from '../../application/ports/auth.repository'
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
}
