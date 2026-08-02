import { User } from '../../domain/entities/User'

export interface AuthCreateUserParams {
    name: string
    email: string
    passwordHash?: string
    roleId: string
    active: number
    firebaseId: string
    provider: 'conventional' | 'google'
    accessToken?: string
}

export interface PersonalCreateParams {
    nombre: string
    apellido: string
    cargo?: string
    telefono?: string
    correoElectronico?: string
    especialidad?: string
    usuarioId: string
    gCalCalendarId?: string | null
}

export interface AuthRepository {
    createUser(params: AuthCreateUserParams): Promise<string>
    findByEmail(email: string): Promise<User | null>
    findById(id: string): Promise<User | null>
    findByFirebaseId(uid: string): Promise<User | null>
    countUsers(): Promise<number>
    listUsers(): Promise<any[]>
    listRoles(): Promise<any[]>
    createRole(name: string): Promise<string>
    updateUserRole(userId: string, roleId: string): Promise<void>
    updateUserProfile(userId: string, payload: { name: string; email: string }): Promise<void>
    deleteUser(userId: string): Promise<void>
    changeUserPassword(userId: string, passwordHash: string): Promise<void>
    createPersonalRecord(params: PersonalCreateParams): Promise<string>
    getSessionVersion(userId: string): Promise<number>
    // Pass the already-known current version (e.g. from a just-fetched User
    // row) to skip the extra read-back query; omit it to fall back to a
    // fresh SELECT after the UPDATE.
    incrementSessionVersion(userId: string, currentVersion?: number): Promise<number>
}
