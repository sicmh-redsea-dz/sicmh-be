import { Request, Response, NextFunction } from "express";

export const errorHandler = (err:any, req:Request, res:Response, next:NextFunction) => {
    console.error('Error stack: ', err.stack)
    if ( err.code === 'ER_DUP_ENTRY' )
        res.status( 401 ).json({ message: 'Duplicate entry for username'})
    else
        res.status( 500 ).json({ message: 'Internal Server Error' })
}