import { RequestHandler } from 'express'
import { body, param, ValidationChain } from 'express-validator'
import { handleValidationErrors } from './validationErrorHandler'

const blankToUndefined = (value: unknown) =>
    value === null || (typeof value === 'string' && !value.trim()) ? undefined : value

const optionalNumeric = (field: string, type: 'i' | 'f') => {
    const chain = body(field).customSanitizer(blankToUndefined).optional()
    return type === 'f'
        ? chain.isFloat().withMessage(`${field} must be a number`).bail().toFloat()
        : chain.isInt().withMessage(`${field} must be an integer`).bail().toInt()
}

const optionalString = (field: string) => body(field).optional({ values: 'null' }).isString()
    .withMessage(`${field} must be text`)

const optionalDate = () => body('date').customSanitizer(blankToUndefined).optional()
    .isISO8601({ strict: true }).withMessage('Date must be a valid ISO date')

const identity = (field: string, required: boolean) => {
    const chain = body(field)
    if (!required) chain.optional()
    return chain.isUUID().withMessage(`${field} must be a valid UUID`)
}

const clinicalFields = () => [
    optionalDate(),
    optionalString('diagnosis'), optionalString('notes'), optionalString('pressure'), optionalString('treatment'),
    optionalNumeric('BMI', 'f'), optionalNumeric('ageAccordingToWeight', 'i'),
    optionalNumeric('fatPercentage', 'f'), optionalNumeric('glucometry', 'f'),
    optionalNumeric('height', 'f'), optionalNumeric('oxygenation', 'i'),
    optionalNumeric('temperature', 'f'), optionalNumeric('visceralFat', 'f'), optionalNumeric('weight', 'f'),
    body('expediente').optional({ values: 'null' }).isObject().withMessage('Expediente must be an object'),
    body('expediente.standard').optional({ values: 'null' }).isObject().withMessage('Standard must be an object'),
    body('expediente.module').optional({ values: 'null' }).isObject().withMessage('Module must be an object'),
]

export const validateCreatePatient: (ValidationChain | RequestHandler)[] = [
    identity('doctor', true), identity('patient', true),
    body('origin').notEmpty().withMessage('Origin is required'),
    ...clinicalFields(), handleValidationErrors,
]

export const validateEditPatient: (ValidationChain | RequestHandler)[] = [
    param('id').isUUID().withMessage('Id must be a valid UUID'),
    identity('doctor', false), identity('patient', false),
    // Existing identity and module metadata can be retained by a partial edit.
    body('origin').optional().notEmpty().withMessage('Origin must not be empty'),
    ...clinicalFields(), handleValidationErrors,
]

export const validateDeletePatient: (ValidationChain | RequestHandler)[] = [
    param('id').isUUID().withMessage('Id must be a valid UUID'), handleValidationErrors,
]
