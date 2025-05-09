import { ResultSetHeader } from "mysql2"
import { Database } from "../../infrastructure/database/Database"
import { authQueries } from "../../infrastructure/database/queries/auth.queries"
import { hashPassword } from "../../utils/passwordUtils"
import { User } from "../entities/User"
import { UserMapper } from "../mappers/UserMapper"
import { AuthResponse } from "../responses/AuthResponse"

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
    static register = async (params:AuthParams): Promise<AuthResponse> => {
        const { name, email, password, uid } = params
        const hashedPassword = await hashPassword( password! )
        const values = [ name, email, hashedPassword, Roles.Admin, 1, uid, 'conventional' ]
        const query = authQueries('register')
        try {
            const result = await Database.execute<ResultSetHeader>(query, values)
            const newUser = await this.getUserData( result.insertId )
            return UserMapper.toAuthResponse( newUser )
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

    static login = async (params:AuthParams): Promise<AuthResponse> => {
        const { email, password } = params
        try {
            const existingUser = await this.getUserData( email )
            if ( !existingUser )
                    throw new Error('Not a valid email')
            return UserMapper.toAuthResponse( existingUser, password )
        } catch ( err ) {
            throw err
        }
    }

    static checkUser = async ( uid:string ) => {
        const query = authQueries('check-user')
        try {
            const user = await Database.execute<User[]>(query, [ uid ])
            if ( user.length !== 0 ) return { exists: true, user: UserMapper.toAuthResponse( user[0] ) }
            return { exists: false, user: {}}
        } catch ( err ) {
            throw err
        }
    }

    static googleRegister = async (params:AuthParams): Promise<AuthResponse> => {
        const { name, email, uid, accessToken } = params
        const query = authQueries('g-register')
        const values = [ name, email, Roles.Admin, 1, uid, 'google', accessToken]
        try {
            const result = await Database.execute<ResultSetHeader>( query, values )
            const newUser = await this.getUserData( result.insertId )
            return UserMapper.toAuthResponse( newUser )
        } catch ( err ) {
            console.log( err )
            throw err
        }
    }

    static checkToken = async (id:string) => {
        const query = authQueries('check-user')
        try {
            const user = await Database.execute<User[]>(query,[ id ])
            return UserMapper.toAuthResponse( user[0] )
        } catch ( err ) {
            throw err
        }
    }

    private static getUserData = async (identifier: number|string): Promise<User> => {
        const value = typeof identifier === 'number' ? 2 : 1
        const query = authQueries('get-user', value)
        try{
            const result = await Database.execute<User[]>(query, [identifier])
            return result[0]
        } catch ( err ) {
            throw err
        }
    }
}