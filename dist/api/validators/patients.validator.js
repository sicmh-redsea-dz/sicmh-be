"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDeletePatient = exports.validatePatchPatient = exports.validatePostPatient = exports.validateGetPatient = exports.validateGetPatients = void 0;
const express_validator_1 = require("express-validator");
const validationErrorHandler_1 = require("./validationErrorHandler");
exports.validateGetPatients = [
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Limit must be a positive integer'),
    (0, express_validator_1.query)('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
    validationErrorHandler_1.handleValidationErrors
];
exports.validateGetPatient = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Id must be a positive integer'),
    validationErrorHandler_1.handleValidationErrors
];
exports.validatePostPatient = [
    (0, express_validator_1.body)('birthdate')
        .notEmpty()
        .withMessage('birthdate is required'),
    (0, express_validator_1.body)('firstName')
        .notEmpty()
        .withMessage('firstName is required')
        .isLength({ min: 2 })
        .withMessage('firstName must be at least 2 characters long'),
    (0, express_validator_1.body)('lastName')
        .notEmpty()
        .withMessage('lastName is required')
        .isLength({ min: 2 })
        .withMessage('lastName must be at least 2 characters long'),
    (0, express_validator_1.body)('address')
        .notEmpty()
        .withMessage('address is required')
        .isLength({ min: 5 })
        .withMessage('address must be at least 5 characters long'),
    (0, express_validator_1.body)('gender')
        .notEmpty()
        .withMessage('gender is required'),
    (0, express_validator_1.body)('phone')
        .notEmpty()
        .withMessage('phone is required')
        .isLength({ min: 8, max: 8 })
        .withMessage('Phone must be 8 characters long'),
    (0, express_validator_1.body)('email')
        .notEmpty()
        .withMessage('email is required')
        .isEmail()
        .withMessage('Invalid email address'),
    (0, express_validator_1.body)('id')
        .notEmpty()
        .withMessage('id is required')
        .isLength({ min: 13, max: 13 })
        .withMessage('id must be 13 characters long'),
    validationErrorHandler_1.handleValidationErrors
];
exports.validatePatchPatient = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Id must be a positive integer'),
    (0, express_validator_1.body)('birthdate')
        .optional()
        .notEmpty()
        .withMessage('birthdate is required'),
    (0, express_validator_1.body)('firstName')
        .optional()
        .notEmpty()
        .withMessage('firstName is required')
        .isLength({ min: 2 })
        .withMessage('firstName must be at least 2 characters long'),
    (0, express_validator_1.body)('lastName')
        .optional()
        .notEmpty()
        .withMessage('lastName is required')
        .isLength({ min: 2 })
        .withMessage('lastName must be at least 2 characters long'),
    (0, express_validator_1.body)('address')
        .optional()
        .notEmpty()
        .withMessage('address is required')
        .isLength({ min: 5 })
        .withMessage('address must be at least 5 characters long'),
    (0, express_validator_1.body)('gender')
        .optional()
        .notEmpty()
        .withMessage('gender is required'),
    (0, express_validator_1.body)('phone')
        .optional()
        .notEmpty()
        .withMessage('phone is required')
        .isLength({ min: 8, max: 8 })
        .withMessage('Phone must be 8 characters long'),
    (0, express_validator_1.body)('email')
        .optional()
        .notEmpty()
        .withMessage('email is required')
        .isEmail()
        .withMessage('Invalid email address'),
    validationErrorHandler_1.handleValidationErrors
];
exports.validateDeletePatient = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Id must be a positive integer'),
    validationErrorHandler_1.handleValidationErrors
];
