import { RequestHandler } from 'express'
import { body, ValidationChain } from 'express-validator'
import { handleValidationErrors } from './validationErrorHandler'

export const validateRegister: (ValidationChain | RequestHandler)[] = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email address'),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
]

export const validateLogin: (ValidationChain | RequestHandler)[] = [
  body('email')
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email address'),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
]
