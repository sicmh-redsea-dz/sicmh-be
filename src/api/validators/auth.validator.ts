import { RequestHandler } from 'express';
import { body, ValidationChain } from 'express-validator';
import { handleValidationErrors } from './validationErrorHandler';

export const validateRegister: (ValidationChain | RequestHandler)[] = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 charactes'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address'),
  body('accessToken')
    .optional()
    .isString()
    .withMessage('Invalid access token'),
  handleValidationErrors,
];

export const validateLogin = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address'),
  handleValidationErrors,
];
