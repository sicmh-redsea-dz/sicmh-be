"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const Database_1 = require("../../infrastructure/database/Database");
const auth_queries_1 = require("../../infrastructure/database/queries/auth.queries");
const passwordUtils_1 = require("../../utils/passwordUtils");
const UserMapper_1 = require("../mappers/UserMapper");
var Roles;
(function (Roles) {
    Roles[Roles["Admin"] = 6] = "Admin";
    Roles[Roles["Doctor"] = 2] = "Doctor";
    Roles[Roles["Enfermera"] = 3] = "Enfermera";
    Roles[Roles["Recepcionista"] = 4] = "Recepcionista";
    Roles[Roles["Asistente"] = 5] = "Asistente";
})(Roles || (Roles = {}));
class AuthService {
}
exports.AuthService = AuthService;
_a = AuthService;
AuthService.register = async (params) => {
    const { name, email, password, uid } = params;
    const hashedPassword = await (0, passwordUtils_1.hashPassword)(password);
    const values = [name, email, hashedPassword, Roles.Admin, 1, uid, 'conventional'];
    const query = (0, auth_queries_1.authQueries)('register');
    try {
        const result = await Database_1.Database.execute(query, values);
        const newUser = await _a.getUserData(result.insertId);
        return UserMapper_1.UserMapper.toAuthResponse(newUser);
    }
    catch (err) {
        let error = new Error();
        if (err.code === 'ER_DUP_ENTRY') {
            error.name = 'duplicate_entry';
            error.message = `Duplicated entry ${name} | ${email}`;
            throw error;
        }
        else {
            throw err;
        }
    }
};
AuthService.login = async (params) => {
    const { email, password } = params;
    try {
        const existingUser = await _a.getUserData(email);
        if (!existingUser)
            throw new Error('Not a valid email');
        return UserMapper_1.UserMapper.toAuthResponse(existingUser, password);
    }
    catch (err) {
        throw err;
    }
};
AuthService.checkUser = async (uid) => {
    const query = (0, auth_queries_1.authQueries)('check-user');
    try {
        const user = await Database_1.Database.execute(query, [uid]);
        if (user.length !== 0)
            return { exists: true, user: UserMapper_1.UserMapper.toAuthResponse(user[0]) };
        return { exists: false, user: {} };
    }
    catch (err) {
        throw err;
    }
};
AuthService.googleRegister = async (params) => {
    const { name, email, uid, accessToken } = params;
    const query = (0, auth_queries_1.authQueries)('g-register');
    const values = [name, email, Roles.Admin, 1, uid, 'google', accessToken];
    try {
        const result = await Database_1.Database.execute(query, values);
        const newUser = await _a.getUserData(result.insertId);
        return UserMapper_1.UserMapper.toAuthResponse(newUser);
    }
    catch (err) {
        console.log(err);
        throw err;
    }
};
AuthService.checkToken = async (id) => {
    const query = (0, auth_queries_1.authQueries)('check-user');
    try {
        const user = await Database_1.Database.execute(query, [id]);
        return UserMapper_1.UserMapper.toAuthResponse(user[0]);
    }
    catch (err) {
        throw err;
    }
};
AuthService.getUserData = async (identifier) => {
    const value = typeof identifier === 'number' ? 2 : 1;
    const query = (0, auth_queries_1.authQueries)('get-user', value);
    try {
        const result = await Database_1.Database.execute(query, [identifier]);
        return result[0];
    }
    catch (err) {
        throw err;
    }
};
