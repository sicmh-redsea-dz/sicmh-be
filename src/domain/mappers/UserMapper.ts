import { generateToken } from "../../config/jwt";
import { comparePassword } from "../../utils/passwordUtils";
import { AuthResponse } from "../responses/AuthResponse";
import { User } from "../entities/User";

export class UserMapper {
    static toAuthResponse(user: User, password?: string): AuthResponse {
        const { 
            CorreoElectronico: email,
            ContrasenaHash: pass,
            NombreUsuario: name,
            UsuarioID: id,
            Activo,
            NombreRol: Rol,
            firebaseID: fireUID
        } = user

        if( password && !comparePassword(password, pass!) ) 
            throw new Error('Not a valid Password')

        const isActive = Activo ? true : false

        return {
            _id: id,
            email,
            name,
            roles: [Rol],
            isActive,
            fireUID
        }
    }
}