import { Pool, ResultSetHeader } from 'mysql2/promise'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import * as dotenv from 'dotenv'

import { queries } from '../helper/auth/queries'
import { Login, Register, AuthResponse } from '../models/auth.model'

dotenv.config()

enum Roles {
  Admin         = 1,
  Doctor        = 2,
  Enfermera     = 3,
  Recepcionista = 4, 
  Asistente     = 5
}

enum queryKeys {
 GetUser  = 'getUser',
 Register = 'register' 
}
interface UserRow {
  Activo            : number
  NombreRol         : string
  UsuarioID         : number
  NombreUsuario     : string
  ContrasenaHash    : string
  CorreoElectronico : string
}

const secretJwtToken = process.env.SECRET_JWT_TOKEN || '';
export class AuthService {

  constructor(private pool: Pool) {}

  public async login({email, password}:Login): Promise<AuthResponse> {
    try {
      const existingUser = await this.getUserData( email )
      if( !existingUser ) throw new Error('Not a valid Email')
      return this.formatDataForResp(existingUser, password)
    } catch( err: any ) {
      console.error('Error: ', err )
      throw new Error( err.message )
    }
  }

  public async register({email,name, password}: Register): Promise<AuthResponse> {
    const query = queries(queryKeys.Register)
    const hashedPassword = bcrypt.hashSync( password, 10 )
    const values = [ name, email, hashedPassword, Roles.Admin, 1 ]
    try {
      const [ response ]: [ResultSetHeader, any] = await this.pool.execute(query, values)
      const { insertId: id } = response
      const newUser = await this.getUserData( id )
      return this.formatDataForResp(newUser)
    }catch( err: any ) {
      console.error('Error exec query: ', err.message)
      if( err.errno === 1062 ) throw new Error('Duplicate entry')
      else throw new Error('Error creating new User')
    }
  }

  public async checkToken( id: number ) {
    const user = await this.getUserData( id )
    return this.formatDataForResp(user)
  }

  private formatDataForResp(user: UserRow, password?: string): AuthResponse {
    const { CorreoElectronico: email, ContrasenaHash: pass, NombreUsuario: name, UsuarioID: id, Activo, NombreRol: Rol} = user
    if( password && !bcrypt.compareSync(password, pass) ) throw new Error('Not a valid Password')
    let isActive = Activo ? true : false
    const token = this.getJwtToken({id, name})
    return {_id:id, email, name, roles: [Rol], isActive, token}
  }

  private async getUserData(val: string | number): Promise<UserRow> {
    const query = queries(queryKeys.GetUser, typeof val === 'number' ? 2 : 1)
    const [response]: [UserRow[], any] = await this.pool.execute<[UserRow[], any]>( query, [ val ])
    let [ user ] = response
    return user
  }

  private getJwtToken({id, name}: {id: number, name: string}): string {
    return jwt.sign({id, name}, secretJwtToken, { expiresIn: '1h'})
  }
}