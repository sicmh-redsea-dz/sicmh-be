import { Request, Response, NextFunction } from "express";

export const errorHandler = (err:any, req:Request, res:Response, next:NextFunction) => {
    if ( err.name === 'validation_errors')
        return res.status( 400 ).json({ message: err.errors })
    if ( err.name === 'duplicate_entry' )
        return res.status( 401 ).json({ message: err.message})
    if ( err.name === 'not_found_error' )
        return res.status( 404 ).json({ message: err.message })
    
    return res.status( 500 ).json({ message: 'Internal Server Error' })
}