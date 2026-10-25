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
        .isUUID()
        .withMessage('Id must be a valid UUID'),
    handleValidationErrors
]

const identificationFields = [
    body('identificationType').optional().isIn(['identidad', 'carne_residencia', 'pasaporte']),
    body('id').optional().isString().isLength({ min: 1, max: 50 }).custom((value, { req }) => {
        const type = req.body.identificationType
        if (type === 'identidad' && !/^\d{13}$/.test(value)) throw new Error('Identidad: exactamente 13 digitos numericos.')
        if (type === 'carne_residencia' && !/^\d{1,19}$/.test(value)) throw new Error('Carne de residencia: de 1 a 19 digitos numericos.')
        if (type === 'pasaporte' && !/^[A-Za-z0-9]{1,50}$/.test(value)) throw new Error('Pasaporte: solo letras y numeros, hasta 50 caracteres.')
        return true
    }),
    body('notes').optional().isString(),
    body('emergencyContact').optional({ nullable: true }).custom(value => {
        if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Contacto de emergencia invalido.')
        const limits: Record<string, number> = { name: 150, relationship: 80, phone: 30, email: 190, address: 500 }
        for (const [field, limit] of Object.entries(limits)) {
            if (value[field] !== undefined && (typeof value[field] !== 'string' || value[field].length > limit))
                throw new Error(`Contacto de emergencia: ${field} invalido.`)
        }
        return true
    }),
    body('emergencyContact.email').customSanitizer(value => typeof value === 'string' ? value.trim() : value).optional({ checkFalsy: true }).isEmail(),
]

export const validatePostPatient: (ValidationChain | RequestHandler)[] = [
    body('birthdate')
        .notEmpty()
        .withMessage('birthdate is required').isISO8601({ strict: true }).withMessage('Invalid birthdate'),
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
        .optional({ checkFalsy: true })
        .isString().isLength({ max: 500 }),
    body('gender')
        .notEmpty()
        .withMessage('gender is required'),
    body('phone').optional({ checkFalsy: true }).isString().isLength({ max: 30 }),
    body('email').customSanitizer(value => typeof value === 'string' ? value.trim() : value)
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Invalid email address'),
    body('id')
        .notEmpty()
        .withMessage('id is required'),
    ...identificationFields,
    handleValidationErrors
]

export const validatePatchPatient: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isUUID()
        .withMessage('Id must be a valid UUID'),
    body('birthdate')
        .optional()
        .notEmpty()
        .withMessage('birthdate is required').isISO8601({ strict: true }).withMessage('Invalid birthdate'),
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
        .optional({ checkFalsy: true })
        .isString().isLength({ max: 500 }),
    body('gender')
        .optional()
        .notEmpty()
        .withMessage('gender is required'),
    body('phone')
        .optional({ checkFalsy: true })
        .isLength({ max: 30 })
        .withMessage('Phone must be at most 30 characters long'),
    body('email').customSanitizer(value => typeof value === 'string' ? value.trim() : value)
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Invalid email address'),
    body('id')
        .optional()
        .notEmpty()
        .withMessage('id is required'),
    ...identificationFields,
    handleValidationErrors
]

export const validateDeletePatient: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isUUID()
        .withMessage('Id must be a valid UUID'),
    handleValidationErrors
]
