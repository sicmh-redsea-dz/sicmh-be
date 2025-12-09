"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
const asyncHandler = () => {
    return (_target, _propertyKey, descriptor) => {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const [_req, res, next] = args;
            try {
                const result = await originalMethod.apply(this, args);
                if (result !== undefined)
                    res.status(200).json({
                        success: true,
                        message: 'Service executed successfully',
                        data: result
                    });
            }
            catch (err) {
                next(err);
            }
        };
        return descriptor;
    };
};
exports.asyncHandler = asyncHandler;
