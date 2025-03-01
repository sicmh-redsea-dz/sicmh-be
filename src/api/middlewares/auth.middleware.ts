import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../../config/jwt";

export const authMiddleware = (req:Request, res:Response, next: NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    if ( !token ) {
        res.status( 401 ).json({ message: 'Access denied. No token provided.'})
        return 
    }

    try{
        const decoded = verifyToken(token);
        ( req as any ).user = decoded
        next()
    } catch ( err ) {
        res.status( 400 ).json({ message: 'Invalid token.' })
    }
}