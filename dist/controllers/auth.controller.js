"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkToken = exports.register = exports.login = void 0;
const auth_srvc_1 = require("../services/auth.srvc");
const db_1 = require("../config/db");
const authService = new auth_srvc_1.AuthService(db_1.pool);
const login = async (req, res) => {
    const bodyParams = req.body;
    try {
        const loggedInUser = await authService.login(bodyParams);
        const { token, ...user } = loggedInUser;
        res.status(202).json({
            user: user,
            token: token
        });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};
exports.login = login;
const register = async (req, res) => {
    const bodyParams = req.body;
    try {
        const registeredUser = await authService.register(bodyParams);
        const { token, ...user } = registeredUser;
        res.status(201).json({
            user: user,
            token: token
        });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};
exports.register = register;
const checkToken = async (req, res) => {
    const { id } = req.user;
    const currentUser = await authService.checkToken(id);
    const { token, ...user } = currentUser;
    res.status(200).json({
        user,
        token
    });
};
exports.checkToken = checkToken;
