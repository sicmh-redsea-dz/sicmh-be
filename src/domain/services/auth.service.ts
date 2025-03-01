import { ResultSetHeader } from "mysql2"
import { Database } from "../../infrastructure/database/Database"
import { authQueries } from "../../infrastructure/database/queries/auth.queries"
import { hashPassword } from "../../utils/passwordUtils"
import { User } from "../entities/User"
import { UserMapper } from "../mappers/UserMapper"
import { AuthResponse } from "../entities/AuthResponse"

interface AuthParams {
    name?: string
    email: string
    password: string
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
        const { name, email, password } = params
        const hashedPassword = await hashPassword( password )
        const values = [ name, email, hashedPassword, Roles.Admin, 1 ]
        const query = authQueries('register')
        try {
            const result = await Database.execute<ResultSetHeader>(query, values)
            const newUser = await this.getUserData( result.insertId )
            return UserMapper.toAuthResponse( newUser )
        } catch ( err ) {
            throw err;
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

    static checkToken = async (id:number) => {
        const user = await this.getUserData( id )
        return UserMapper.toAuthResponse( user )
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