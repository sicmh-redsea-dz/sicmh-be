"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDeletePatient = exports.validateEditPatient = exports.validateCreatePatient = void 0;
const express_validator_1 = require("express-validator");
const validationErrorHandler_1 = require("./validationErrorHandler");
const optionalNumeric = (field, type) => {
    const chain = (0, express_validator_1.body)(field)
        .optional();
    // .isNumeric()
    // .withMessage(`${ field } must be a number`)
    return type === 'f' ? chain.toFloat() : chain.toInt();
};
const optionalString = (field) => (0, express_validator_1.body)(field)
    .optional();
// .withMessage(`${ field } must be at least 5 characters long.`)
exports.validateCreatePatient = [
    optionalNumeric('BMI', 'f'),
    optionalNumeric('ageAccordingToWeight', 'i'),
    (0, express_validator_1.body)('date')
        .notEmpty()
        .withMessage('Date is required'),
    optionalString('diagnosis'),
    (0, express_validator_1.body)('doctor')
        .notEmpty()
        .withMessage('Doctor ID is required')
        .toInt(),
    optionalNumeric('fatPercentage', 'f'),
    optionalNumeric('glucometry', 'f'),
    optionalNumeric('height', 'f'),
    optionalString('notes'),
    optionalNumeric('oxygenation', 'i'),
    (0, express_validator_1.body)('patient')
        .notEmpty()
        .withMessage('Patient ID is required.')
        .toInt(),
    (0, express_validator_1.body)('pressure')
        .optional()
        .notEmpty()
        .withMessage('Pressure is required'),
    optionalNumeric('temperature', 'i'),
    optionalString('treatment'),
    optionalNumeric('visceralFat', 'f'),
    optionalNumeric('weight', 'f'),
    validationErrorHandler_1.handleValidationErrors
];
exports.validateEditPatient = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Id must be a positive integer'),
    optionalNumeric('BMI', 'f'),
    optionalNumeric('ageAccordingToWeight', 'i'),
    (0, express_validator_1.body)('date')
        .notEmpty()
        .withMessage('Date is required'),
    optionalString('diagnosis'),
    (0, express_validator_1.body)('doctor')
        .toInt(),
    optionalNumeric('fatPercentage', 'f'),
    optionalNumeric('glucometry', 'f'),
    optionalNumeric('height', 'f'),
    optionalString('notes'),
    optionalNumeric('oxygenation', 'i'),
    (0, express_validator_1.body)('patient')
        .toInt(),
    (0, express_validator_1.body)('pressure')
        .optional(),
    optionalNumeric('temperature', 'i'),
    optionalString('treatment'),
    optionalNumeric('visceralFat', 'f'),
    optionalNumeric('weight', 'f'),
    validationErrorHandler_1.handleValidationErrors
];
exports.validateDeletePatient = [
    (0, express_validator_1.param)('id')
        .isInt({ min: 1 })
        .withMessage('Id must be a positive integer'),
    validationErrorHandler_1.handleValidationErrors
];
