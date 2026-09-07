import { RequestHandler } from 'express';
import { body, param, ValidationChain } from 'express-validator';
import { handleValidationErrors } from './validationErrorHandler';

export const validateChangeUserPassword: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isUUID()
        .withMessage('Id must be a valid UUID'),
    body('newPassword')
        .notEmpty()
        .withMessage('La contraseña es obligatoria.')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres.'),
    handleValidationErrors
]
