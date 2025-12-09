"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, res, next) => {
    if (err.name === 'validation_errors')
        return res.status(400).json({ message: err.errors });
    if (err.name === 'duplicate_entry')
        return res.status(401).json({ message: err.message });
    if (err.name === 'not_found_error')
        return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: 'Internal Server Error' });
};
exports.errorHandler = errorHandler;
