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
}
