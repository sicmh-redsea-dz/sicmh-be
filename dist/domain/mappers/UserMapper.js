"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMapper = void 0;
const passwordUtils_1 = require("../../utils/passwordUtils");
class UserMapper {
    static toAuthResponse(user, password) {
        const { CorreoElectronico: email, ContrasenaHash: pass, NombreUsuario: name, UsuarioID: id, Activo, NombreRol: Rol, firebaseID: fireUID } = user;
        if (password && !(0, passwordUtils_1.comparePassword)(password, pass))
            throw new Error('Not a valid Password');
        const isActive = Activo ? true : false;
        return {
            _id: id,
            email,
            name,
            roles: [Rol],
            isActive,
            fireUID
        };
    }
}
exports.UserMapper = UserMapper;
