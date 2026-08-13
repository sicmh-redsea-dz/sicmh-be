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

export interface PersonalCreateParams {
    nombre: string
    apellido: string
    cargo?: string
    telefono?: string
    direccion?: string
    correoElectronico?: string
    especialidad?: string
    usuarioId: number
    gCalCalendarId?: string | null
}

export interface PasswordResetToken {
    id: number
    userId: number
}

export interface AuthRepository {
    createUser(params: AuthCreateUserParams): Promise<number>
    findByEmail(email: string): Promise<User | null>
    findById(id: number): Promise<User | null>
    findByFirebaseId(uid: string): Promise<User | null>
    countUsers(): Promise<number>
    listUsers(): Promise<any[]>
    listRoles(): Promise<any[]>
    createRole(name: string): Promise<number>
    updateUserRole(userId: number, roleId: number): Promise<void>
    updateUserProfile(userId: number, payload: { name: string; email: string }): Promise<void>
    getPersonalProfile(userId: number): Promise<any | null>
    updatePersonalProfile(userId: number, payload: { name: string; email: string; phone?: string; address?: string; department?: string; position?: string }): Promise<void>
    deleteUser(userId: number): Promise<void>
    changeUserPassword(userId: number, passwordHash: string): Promise<void>
    createPersonalRecord(params: PersonalCreateParams): Promise<number>
    getSessionVersion(userId: number): Promise<number>
    // Pass the already-known current version (e.g. from a just-fetched User
    // row) to skip the extra read-back query; omit it to fall back to a
    // fresh SELECT after the UPDATE.
    incrementSessionVersion(userId: number, currentVersion?: number): Promise<number>
    canIssuePasswordResetToken(userId: number): Promise<boolean>
    replacePasswordResetToken(userId: number, tokenHash: string, expiresAt: Date): Promise<void>
    consumePasswordResetToken(tokenHash: string, passwordHash: string): Promise<boolean>
}
