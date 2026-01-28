import { comparePassword } from "../../utils/passwordUtils";
import { AuthResponse } from "../responses/AuthResponse";
import { User } from "../entities/User";

export class UserMapper {
    static async toAuthResponse(user: User, password?: string): Promise<AuthResponse> {
        const { 
            CorreoElectronico: email,
            ContrasenaHash: pass,
            NombreUsuario: name,
            UsuarioID: id,
            Activo,
            NombreRol: Rol,
            firebaseID: fireUID
        } = user

        if( password ) {
            const isValid = await comparePassword(password, pass!)
            if ( !isValid )
            throw new Error('Not a valid Password')
        }

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
