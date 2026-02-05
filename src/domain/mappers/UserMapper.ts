import { AuthResponse } from "../responses/AuthResponse";
import { User } from "../entities/User";

export class UserMapper {
  static async toAuthResponse(user: User): Promise<AuthResponse> {
    const {
      CorreoElectronico: email,
      NombreUsuario: name,
      UsuarioID: id,
      Activo,
      NombreRol: Rol,
      firebaseID: fireUID,
    } = user;

    const isActive = Activo ? true : false;

    return {
      _id: id,
      email,
      name,
      roles: [Rol],
      isActive,
      fireUID,
    };
  }
}
