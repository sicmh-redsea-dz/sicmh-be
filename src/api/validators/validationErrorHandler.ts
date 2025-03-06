import { NextFunction, Request, Response } from "express"
import { validationResult } from "express-validator"

export const handleValidationErrors: any = (req:Request, res:Response, next: NextFunction) => {
    const errors = validationResult( req )
    if ( !errors.isEmpty() ) {
        next({
            name: 'validation_errors',
            errors: errors
                .array()
                .map(err => { return {'msg': err.msg }})
        })
        return
    }
    next()
}