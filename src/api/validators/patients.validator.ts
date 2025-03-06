import { RequestHandler } from "express";
import { body, param, query, ValidationChain } from "express-validator";
import { handleValidationErrors } from './validationErrorHandler'

export const validateGetPatients: (ValidationChain | RequestHandler)[] = [
    query('limit')
        .optional()
        .isInt({min:1})
        .withMessage('Limit must be a positive integer'),
    query('offset')
        .optional()
        .isInt({min: 0})
        .withMessage('Offset must be a non-negative integer'),
    handleValidationErrors
]

export const validateGetPatient: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isInt({min: 1})
        .withMessage('Id must be a positive integer'),
    handleValidationErrors
]

export const validatePostPatient: (ValidationChain | RequestHandler)[] = [
    body('birthdate')
        .notEmpty()
        .withMessage('birthdate is required'),
    body('firstName')
        .notEmpty()
        .withMessage('firstName is required')
        .isLength({ min: 2 })
        .withMessage('firstName must be at least 2 characters long'),
    body('lastName')
        .notEmpty()
        .withMessage('lastName is required')
        .isLength({ min: 2 })
        .withMessage('lastName must be at least 2 characters long'),
    body('address')
        .notEmpty()
        .withMessage('address is required')
        .isLength({ min: 5 })
        .withMessage('address must be at least 5 characters long'),
    body('gender')
        .notEmpty()
        .withMessage('gender is required'),
    body('phone')
        .notEmpty()
        .withMessage('phone is required')
        .isLength({ min: 8, max: 8 })
        .withMessage('Phone must be 8 characters long'),
    body('email')
        .notEmpty()
        .withMessage('email is required')
        .isEmail()
        .withMessage('Invalid email address'),
    body('idNumber')
        .notEmpty()
        .withMessage('idNumber is required')
        .isLength({ min: 13, max: 13 })
        .withMessage('idNumber must be 13 characters long'),
    handleValidationErrors
]

export const validatePatchPatient: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Id must be a positive integer'),
    body('birthdate')
        .optional()
        .notEmpty()
        .withMessage('birthdate is required'),
    body('firstName')
        .optional()
        .notEmpty()
        .withMessage('firstName is required')
        .isLength({ min: 2 })
        .withMessage('firstName must be at least 2 characters long'),
    body('lastName')
        .optional()
        .notEmpty()
        .withMessage('lastName is required')
        .isLength({ min: 2 })
        .withMessage('lastName must be at least 2 characters long'),
    body('address')
        .optional()
        .notEmpty()
        .withMessage('address is required')
        .isLength({ min: 5 })
        .withMessage('address must be at least 5 characters long'),
    body('gender')
        .optional()
        .notEmpty()
        .withMessage('gender is required'),
    body('phone')
        .optional()
        .notEmpty()
        .withMessage('phone is required')
        .isLength({ min: 8, max: 8 })
        .withMessage('Phone must be 8 characters long'),
    body('email')
        .optional()
        .notEmpty()
        .withMessage('email is required')
        .isEmail()
        .withMessage('Invalid email address'),
    handleValidationErrors
]

export const validateDeletePatient: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Id must be a positive integer'),
    handleValidationErrors
]