"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGRegister = exports.validateCheckUser = exports.validateLogin = exports.validateRegister = void 0;
const express_validator_1 = require("express-validator");
const validationErrorHandler_1 = require("./validationErrorHandler");
exports.validateRegister = [
    (0, express_validator_1.body)('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 charactes'),
    (0, express_validator_1.body)('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email address'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long.'),
    validationErrorHandler_1.handleValidationErrors
];
exports.validateLogin = [
    (0, express_validator_1.body)('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email address'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required'),
    validationErrorHandler_1.handleValidationErrors
];
exports.validateCheckUser = [
    (0, express_validator_1.body)('uid')
        .notEmpty()
        .withMessage('UID is required'),
    validationErrorHandler_1.handleValidationErrors
];
exports.validateGRegister = [
    (0, express_validator_1.body)('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 charactes'),
    (0, express_validator_1.body)('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email address'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long.'),
    (0, express_validator_1.body)('uid')
        .notEmpty()
        .withMessage('uid is required'),
    validationErrorHandler_1.handleValidationErrors
];
