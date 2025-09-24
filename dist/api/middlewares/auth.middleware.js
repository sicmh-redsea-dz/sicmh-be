"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const fs_1 = require("fs");
const path_1 = require("path");
// import { verifyToken } from '../../config/jwt';
const serviceAccountPath = (0, path_1.join)(__dirname, 'sampleapp-d2514-firebase-adminsdk-fbsvc-339751be6c.json');
const serviceAccount = JSON.parse((0, fs_1.readFileSync)(serviceAccountPath, 'utf-8'));
if (!firebase_admin_1.default.apps.length)
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount)
    });
const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        res.status(401).json({ message: 'Access denied. No token provided.' });
        return;
    }
    try {
        const decodedToken = await firebase_admin_1.default.auth().verifyIdToken(token);
        if (!decodedToken.uid) {
            res.status(403).json({ message: 'Invalid token: no UID found.' });
            return;
        }
        req.user = decodedToken;
        next();
    }
    catch (err) {
        let errorMessage = 'invalid token';
        let statusCode = 400;
        if (err.code === 'auth/id-token-expired') {
            errorMessage = 'Token expired. Please login again.';
            statusCode = 401;
        }
        else if (err.code === 'auth/argument-error') {
            errorMessage = 'Invalid token format.';
        }
        else if (err.code === 'auth/id-token-revoked') {
            errorMessage = 'Token has been revoked. Please login again.';
            statusCode = 403;
        }
        res.status(400).json({ message: 'Invalid token.' });
    }
};
exports.authMiddleware = authMiddleware;
