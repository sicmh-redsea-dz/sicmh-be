import { RequestHandler } from 'express';
import { body, param, ValidationChain } from 'express-validator';
import { handleValidationErrors } from './validationErrorHandler';

// InvoiceNumber is a shortened UUID (see helper/uuidGen.ts), not a numeric id.
export const validateInvoiceNumberParam: (ValidationChain | RequestHandler)[] = [
    param('id')
        .trim()
        .notEmpty()
        .withMessage('Invoice number is required')
        .isLength({ min: 5, max: 64 })
        .withMessage('Invoice number has an invalid length')
        .matches(/^[0-9a-fA-F-]+$/)
        .withMessage('Invoice number has an invalid format'),
    handleValidationErrors
]

export const validateCreateInvoice: (ValidationChain | RequestHandler)[] = [
    body('patient')
        .notEmpty()
        .withMessage('Patient ID is required')
        .isInt({ min: 1 })
        .withMessage('Patient ID must be a positive integer')
        .toInt(),
    body('date')
        .notEmpty()
        .withMessage('Date is required'),
    body('amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Amount must be a non-negative number')
        .toFloat(),
    handleValidationErrors
]

export const validateUpdateInvoice: (ValidationChain | RequestHandler)[] = [
    param('id')
        .trim()
        .notEmpty()
        .withMessage('Invoice number is required')
        .isLength({ min: 5, max: 64 })
        .withMessage('Invoice number has an invalid length')
        .matches(/^[0-9a-fA-F-]+$/)
        .withMessage('Invoice number has an invalid format'),
    body('amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Amount must be a non-negative number')
        .toFloat(),
    handleValidationErrors
]
