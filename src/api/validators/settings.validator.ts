import { RequestHandler } from 'express';
import { body, param, ValidationChain } from 'express-validator';
import { handleValidationErrors } from './validationErrorHandler';

export const validateChangeUserPassword: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Id must be a positive integer'),
    body('newPassword')
        .notEmpty()
        .withMessage('La contraseña es obligatoria.')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres.'),
    handleValidationErrors
]
