import { RequestHandler } from 'express'
import { body, ValidationChain } from 'express-validator'
import { handleValidationErrors } from './validationErrorHandler'

export const validateRegister: (ValidationChain | RequestHandler)[] = [
    body('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 charactes'),
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long.'),
    handleValidationErrors
]

export const validateLogin = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email address'),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
]