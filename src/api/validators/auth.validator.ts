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

export const validateForgotPassword: (ValidationChain | RequestHandler)[] = [
  body('email')
    .trim()
    .notEmpty().withMessage('El correo es obligatorio.')
    .isEmail().withMessage('Ingresa un correo válido.'),
  body('codigoEmpresa')
    .trim()
    .notEmpty().withMessage('El código de empresa es obligatorio.')
    .isAlphanumeric().withMessage('El código de empresa solo puede contener letras y números.')
    .isLength({ min: 3, max: 10 }).withMessage('El código de empresa debe tener entre 3 y 10 caracteres.'),
  handleValidationErrors,
]

export const validateResetPassword: (ValidationChain | RequestHandler)[] = [
  body('token')
    .isString().withMessage('El enlace de restablecimiento es inválido.')
    .matches(/^[a-f0-9]{64}$/i).withMessage('El enlace de restablecimiento es inválido.'),
  body('newPassword')
    .isString().withMessage('La nueva contraseña es obligatoria.')
    .isLength({ min: 8, max: 128 }).withMessage('La contraseña debe tener entre 8 y 128 caracteres.'),
  body('codigoEmpresa')
    .trim()
    .notEmpty().withMessage('El código de empresa es obligatorio.')
    .isAlphanumeric().withMessage('El código de empresa solo puede contener letras y números.')
    .isLength({ min: 3, max: 10 }).withMessage('El código de empresa debe tener entre 3 y 10 caracteres.'),
  handleValidationErrors,
]
