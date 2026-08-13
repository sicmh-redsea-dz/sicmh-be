import { RequestHandler } from "express";
import { body, param, query, ValidationChain } from "express-validator";
import { handleValidationErrors } from './validationErrorHandler'

const identificationTypes = ['identidad', 'pasaporte', 'carne_residencia']

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
        .isInt({min: 1})
        .withMessage('Id must be a positive integer'),
    handleValidationErrors
]

export const validatePostPatient: (ValidationChain | RequestHandler)[] = [
    body('birthdate')
        .notEmpty()
        .withMessage('birthdate is required'),
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
        .isLength({ min: 5 })
        .withMessage('address must be at least 5 characters long'),
    body('gender')
        .notEmpty()
        .withMessage('gender is required'),
    body('phone')
        .optional({ checkFalsy: true })
        .trim(),
    body('email')
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Invalid email address'),
    body('identificationType')
        .optional({ checkFalsy: true })
        .isIn(identificationTypes)
        .withMessage('Invalid identification type'),
    body('id')
        .trim()
        .notEmpty()
        .withMessage('id is required')
        .matches(/^[A-Za-z0-9]+$/)
        .withMessage('id must contain only letters and numbers'),
    body('emergencyContact')
        .optional()
        .isObject()
        .withMessage('emergencyContact must be an object'),
    body('emergencyContact.name')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 })
        .withMessage('Emergency contact name must be at least 2 characters long'),
    body('emergencyContact.relationship')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 })
        .withMessage('Emergency contact relationship must be at least 2 characters long'),
    body('emergencyContact.phone')
        .optional({ checkFalsy: true })
        .trim(),
    body('emergencyContact.email')
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Invalid emergency contact email address'),
    body('emergencyContact.address')
        .optional({ checkFalsy: true })
        .trim(),
    handleValidationErrors
]

export const validatePatchPatient: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Id must be a positive integer'),
    body('birthdate')
        .optional()
        .notEmpty()
        .withMessage('birthdate is required'),
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
        .isLength({ min: 5 })
        .withMessage('address must be at least 5 characters long'),
    body('gender')
        .optional()
        .notEmpty()
        .withMessage('gender is required'),
    body('phone')
        .optional({ checkFalsy: true })
        .trim(),
    body('email')
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Invalid email address'),
    body('identificationType')
        .optional()
        .isIn(identificationTypes)
        .withMessage('Invalid identification type'),
    body('id')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('id is required')
        .matches(/^[A-Za-z0-9]+$/)
        .withMessage('id must contain only letters and numbers'),
    body('emergencyContact')
        .optional()
        .isObject()
        .withMessage('emergencyContact must be an object'),
    body('emergencyContact.name')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 })
        .withMessage('Emergency contact name must be at least 2 characters long'),
    body('emergencyContact.relationship')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 })
        .withMessage('Emergency contact relationship must be at least 2 characters long'),
    body('emergencyContact.phone')
        .optional({ checkFalsy: true })
        .trim(),
    body('emergencyContact.email')
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Invalid emergency contact email address'),
    body('emergencyContact.address')
        .optional({ checkFalsy: true })
        .trim(),
    handleValidationErrors
]

export const validateDeletePatient: (ValidationChain | RequestHandler)[] = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Id must be a positive integer'),
    handleValidationErrors
]

