import { RequestHandler } from 'express';
import { body, param, ValidationChain } from 'express-validator';
import { handleValidationErrors } from './validationErrorHandler';

// Ledger item ids are generated with uuidv4() (see billing.service.ts).
export const validateLedgerIdParam: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isUUID()
        .withMessage('Id must be a valid UUID'),
    handleValidationErrors
]

export const validateCreateManualCharge: (ValidationChain | RequestHandler)[] = [
    body('patientId')
        .notEmpty()
        .withMessage('Patient ID is required')
        .isInt({ min: 1 })
        .withMessage('Patient ID must be a positive integer')
        .toInt(),
    body('description')
        .notEmpty()
        .withMessage('Description is required'),
    body('quantity')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Quantity must be a non-negative number')
        .toFloat(),
    body('unitPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Unit price must be a non-negative number')
        .toFloat(),
    handleValidationErrors
]

export const validateUpdateManualCharge: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isUUID()
        .withMessage('Id must be a valid UUID'),
    body('quantity')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Quantity must be a non-negative number')
        .toFloat(),
    body('unitPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Unit price must be a non-negative number')
        .toFloat(),
    handleValidationErrors
]

export const validateCreateMovement: (ValidationChain | RequestHandler)[] = [
    body('patientId')
        .notEmpty()
        .withMessage('Patient ID is required')
        .isInt({ min: 1 })
        .withMessage('Patient ID must be a positive integer')
        .toInt(),
    body('toStation')
        .notEmpty()
        .withMessage('Destination station is required'),
    handleValidationErrors
]
