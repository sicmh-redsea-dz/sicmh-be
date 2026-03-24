import { User } from '../../domain/entities/User'

export interface AuthCreateUserParams {
    name: string
    email: string
    passwordHash?: string
    roleId: number
    active: number
    firebaseId: string
    provider: 'conventional' | 'google'
    accessToken?: string
}

export interface AuthRepository {
    createUser(params: AuthCreateUserParams): Promise<number>
    findByEmail(email: string): Promise<User | null>
    findById(id: number): Promise<User | null>
    findByFirebaseId(uid: string): Promise<User | null>
    listUsers(): Promise<any[]>
    listRoles(): Promise<any[]>
    createRole(name: string): Promise<number>
    updateUserRole(userId: number, roleId: number): Promise<void>
    updateUserProfile(userId: number, payload: { name: string; email: string }): Promise<void>
}
