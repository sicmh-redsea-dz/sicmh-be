import { AuthRepository } from '../ports/auth.repository'
import { hashPassword } from '../../utils/passwordUtils'
import { User } from '../../domain/entities/User'
import { UserMapper } from '../../domain/mappers/UserMapper'
import { AuthResponse } from '../../domain/responses/AuthResponse'

interface AuthParams {
    name?: string
    email: string
    password?: string
    uid: string,
    accessToken?: string
}

enum Roles {
    Admin         = 6,
    Doctor        = 2,
    Enfermera     = 3,
    Recepcionista = 4, 
    Asistente     = 5
  }

export class AuthService {
    constructor(private readonly authRepo: AuthRepository) {}

    register = async (params:AuthParams): Promise<AuthResponse> => {
        const { name, email, password, uid } = params
        const hashedPassword = await hashPassword( password! )
        try {
            const insertId = await this.authRepo.createUser({
                name: name!,
                email,
                passwordHash: hashedPassword,
                roleId: Roles.Admin,
                active: 1,
                firebaseId: uid,
                provider: 'conventional'
            })
            const newUser = await this.getUserData( insertId )
            return await UserMapper.toAuthResponse( newUser )
        } catch ( err:any ) {
            let error = new Error()
            if( err.code === 'ER_DUP_ENTRY') {
                error.name = 'duplicate_entry'
                error.message = `Duplicated entry ${name} | ${email}`
               throw error 
            } else {
                throw err
            }
        }
    }

    login = async (params:AuthParams): Promise<AuthResponse> => {
        const { email, password } = params
        try {
            const existingUser = await this.authRepo.findByEmail( email )
            if ( !existingUser )
                throw new Error('Not a valid email')
            return await UserMapper.toAuthResponse( existingUser, password )
        } catch ( err ) {
            throw err
        }
    }

    checkUser = async ( uid:string ) => {
        try {
            const user = await this.authRepo.findByFirebaseId( uid )
            if ( user ) return { exists: true, user: await UserMapper.toAuthResponse( user ) }
            return { exists: false, user: {}}
        } catch ( err ) {
            throw err
        }
    }

    googleRegister = async (params:AuthParams): Promise<AuthResponse> => {
        const { name, email, uid, accessToken } = params
        try {
            const insertId = await this.authRepo.createUser({
                name: name!,
                email,
                roleId: Roles.Admin,
                active: 1,
                firebaseId: uid,
                provider: 'google',
                accessToken
            })
            const newUser = await this.getUserData( insertId )
            return await UserMapper.toAuthResponse( newUser )
        } catch ( err ) {
            console.log( err )
            throw err
        }
    }

    checkToken = async (id:string) => {
        try {
            const user = await this.authRepo.findByFirebaseId( id )
            if ( !user )
                throw new Error('Not a valid user')
            return await UserMapper.toAuthResponse( user )
        } catch ( err ) {
            throw err
        }
    }

    private getUserData = async (identifier: number|string): Promise<User> => {
        const user = typeof identifier === 'number'
            ? await this.authRepo.findById( identifier )
            : await this.authRepo.findByEmail( identifier )

        if ( !user )
            throw new Error('Not a valid user')

        return user
    }
}
