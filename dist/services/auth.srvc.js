"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv = __importStar(require("dotenv"));
const queries_1 = require("../helper/auth/queries");
dotenv.config();
var Roles;
(function (Roles) {
    Roles[Roles["Admin"] = 6] = "Admin";
    Roles[Roles["Doctor"] = 2] = "Doctor";
    Roles[Roles["Enfermera"] = 3] = "Enfermera";
    Roles[Roles["Recepcionista"] = 4] = "Recepcionista";
    Roles[Roles["Asistente"] = 5] = "Asistente";
})(Roles || (Roles = {}));
var queryKeys;
(function (queryKeys) {
    queryKeys["GetUser"] = "getUser";
    queryKeys["Register"] = "register";
})(queryKeys || (queryKeys = {}));
const secretJwtToken = process.env.SECRET_JWT_TOKEN || '';
class AuthService {
    constructor(pool) {
        this.pool = pool;
    }
    async login({ email, password }) {
        try {
            const existingUser = await this.getUserData(email);
            if (!existingUser)
                throw new Error('Not a valid Email');
            return this.formatDataForResp(existingUser, password);
        }
        catch (err) {
            console.error('Error: ', err);
            throw new Error(err.message);
        }
    }
    async register({ email, name, password }) {
        const query = (0, queries_1.queries)(queryKeys.Register);
        const hashedPassword = bcrypt_1.default.hashSync(password, 10);
        const values = [name, email, hashedPassword, Roles.Admin, 1];
        try {
            const [response] = await this.pool.execute(query, values);
            const { insertId: id } = response;
            const newUser = await this.getUserData(id);
            return this.formatDataForResp(newUser);
        }
        catch (err) {
            console.error('Error exec query: ', err.message);
            if (err.errno === 1062)
                throw new Error('Duplicate entry');
            else
                throw new Error('Error creating new User');
        }
    }
    async checkToken(id) {
        const user = await this.getUserData(id);
        return this.formatDataForResp(user);
    }
    formatDataForResp(user, password) {
        const { CorreoElectronico: email, ContrasenaHash: pass, NombreUsuario: name, UsuarioID: id, Activo, NombreRol: Rol } = user;
        if (password && !bcrypt_1.default.compareSync(password, pass))
            throw new Error('Not a valid Password');
        let isActive = Activo ? true : false;
        const token = this.getJwtToken({ id, name });
        return { _id: id, email, name, roles: [Rol], isActive, token };
    }
    async getUserData(val) {
        const query = (0, queries_1.queries)(queryKeys.GetUser, typeof val === 'number' ? 2 : 1);
        const [response] = await this.pool.execute(query, [val]);
        let [user] = response;
        return user;
    }
    getJwtToken({ id, name }) {
        return jsonwebtoken_1.default.sign({ id, name }, secretJwtToken, { expiresIn: '1h' });
    }
}
exports.AuthService = AuthService;
