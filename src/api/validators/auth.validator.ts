import { RequestHandler } from 'express'
import { body, ValidationChain } from 'express-validator'
import { handleValidationErrors } from './validationErrorHandler'

export const validateRegister: (ValidationChain | RequestHandler)[] = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres.'),
  body('email')
    .notEmpty().withMessage('El correo es obligatorio.')
    .isEmail().withMessage('Ingresa un correo válido.'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
  body('codigoEmpresa')
    .notEmpty().withMessage('El código de empresa es obligatorio.')
    .isAlphanumeric().withMessage('El código de empresa solo puede contener letras y números.')
    .isLength({ min: 3, max: 10 }).withMessage('El código de empresa debe tener entre 3 y 10 caracteres.'),
  handleValidationErrors,
]

export const validateLogin: (ValidationChain | RequestHandler)[] = [
  body('email')
    .notEmpty().withMessage('El correo es obligatorio.')
    .isEmail().withMessage('Ingresa un correo válido.'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria.')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
  body('codigoEmpresa')
    .notEmpty().withMessage('El código de empresa es obligatorio.')
    .isAlphanumeric().withMessage('El código de empresa solo puede contener letras y números.')
    .isLength({ min: 3, max: 10 }).withMessage('El código de empresa debe tener entre 3 y 10 caracteres.'),
  handleValidationErrors,
]
