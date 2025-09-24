"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../../domain/services/auth.service");
class AuthController {
}
exports.AuthController = AuthController;
_a = AuthController;
AuthController.register = async (req, res, next) => {
    const body = req.body;
    try {
        const registeredUser = await auth_service_1.AuthService.register(body);
        const { ...user } = registeredUser;
        res.status(202).json({
            user
        });
    }
    catch (err) {
        next(err);
    }
};
AuthController.login = async (req, res, next) => {
    const body = req.body;
    try {
        const loggedUser = await auth_service_1.AuthService.login(body);
        const { ...user } = loggedUser;
        res.status(202).json({
            user
        });
    }
    catch (err) {
        next(err);
    }
};
AuthController.checkUser = async (req, res, next) => {
    const { uid } = req.body;
    try {
        const { exists, user } = await auth_service_1.AuthService.checkUser(uid);
        res.status(200).json({
            user,
            exists
        });
    }
    catch (err) {
        next(err);
    }
};
AuthController.googleResgister = async (req, res, next) => {
    const body = req.body;
    try {
        const user = await auth_service_1.AuthService.googleRegister(body);
        res.status(202).json({
            user
        });
    }
    catch (err) {
        next(err);
    }
};
AuthController.checkToken = async (req, res, next) => {
    const { uid: id } = req.user;
    try {
        const currentUser = await auth_service_1.AuthService.checkToken(id);
        const { ...user } = currentUser;
        res.status(200).json({
            user
        });
    }
    catch (err) {
        next(err);
    }
};
