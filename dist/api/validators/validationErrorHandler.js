"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        next({
            name: 'validation_errors',
            errors: errors
                .array()
                .map(err => { return { 'msg': err.msg }; })
        });
        return;
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
