import { RequestHandler } from 'express';
import { body, param, ValidationChain } from 'express-validator';
import { handleValidationErrors } from './validationErrorHandler';

const optionalNumeric = ( field: string, type: 'i'|'f' ) => {
    const chain = 
        body( field )
            .optional({ values: 'falsy' })
            // .isNumeric()
            // .withMessage(`${ field } must be a number`)
    return type === 'f' ? chain.toFloat() : chain.toInt()
}

const optionalString = ( field: string ) => 
    body( field )
        .optional({ values: 'falsy' })
        // .withMessage(`${ field } must be at least 5 characters long.`)
    
export const validateCreatePatient: (ValidationChain | RequestHandler)[] = [
    optionalNumeric('BMI', 'f'),
    optionalNumeric('ageAccordingToWeight', 'i'),
    optionalString('date'),
    body('origin')
        .notEmpty()
        .withMessage('Origin is required'),
    optionalString('diagnosis'),
    body('doctor')
        .notEmpty()
        .withMessage('Doctor ID is required')
        .toInt(),
    optionalNumeric('fatPercentage', 'f'),
    optionalNumeric('glucometry', 'f'),
    optionalNumeric('height', 'f'),
    optionalString('notes'),
    optionalNumeric('oxygenation', 'i'),
    body('patient')
        .notEmpty()
        .withMessage('Patient ID is required.')
        .toInt(),
    optionalString('pressure'),
    optionalNumeric('temperature', 'i'),
    optionalString('treatment'),
    optionalNumeric('visceralFat', 'f'),
    optionalNumeric('weight', 'f'),
    handleValidationErrors
]

export const validateEditPatient: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Id must be a positive integer'),
    optionalNumeric('BMI', 'f'),
    optionalNumeric('ageAccordingToWeight', 'i'),
    optionalString('date'),
    body('origin')
        .notEmpty()
        .withMessage('Origin is required'),
    optionalString('diagnosis'),
    body('doctor')
        .notEmpty()
        .withMessage('Doctor ID is required')
        .toInt(),
    optionalNumeric('fatPercentage', 'f'),
    optionalNumeric('glucometry', 'f'),
    optionalNumeric('height', 'f'),
    optionalString('notes'),
    optionalNumeric('oxygenation', 'i'),
    body('patient')
        .notEmpty()
        .withMessage('Patient ID is required.')
        .toInt(),
    optionalString('pressure'),
    optionalNumeric('temperature', 'i'),
    optionalString('treatment'),
    optionalNumeric('visceralFat', 'f'),
    optionalNumeric('weight', 'f'),
    handleValidationErrors
]

export const validateDeletePatient: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Id must be a positive integer'),
    handleValidationErrors
]
