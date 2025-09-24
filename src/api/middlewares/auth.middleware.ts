import { NextFunction, Request, Response } from 'express'
import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { join } from 'path'

// import { verifyToken } from '../../config/jwt';

// const serviceAccountPath = join(__dirname, 'sampleapp-d2514-firebase-adminsdk-fbsvc-339751be6c.json');
// const serviceAccount = JSON.parse(
//     readFileSync(
//         serviceAccountPath, 
//         'utf-8'
//     )
// )


// if ( !admin.apps.length ) admin.initializeApp({
//     credential: admin.credential.cert( serviceAccount )
// })

export const authMiddleware = async (req:Request, res:Response, next:NextFunction) => {
    
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if ( !token ) {
        res.status( 401 ).json({ message: 'Access denied. No token provided.'})
        return 
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken( token );
        
        if ( !decodedToken.uid ) {
            res.status(403).json({ message: 'Invalid token: no UID found.'});
            return
        }

        ( req as any ).user = decodedToken
        next()
    } catch ( err: any ) {
        let errorMessage = 'invalid token'
        let statusCode = 400
        
        if (err.code === 'auth/id-token-expired') {
            errorMessage = 'Token expired. Please login again.';
            statusCode = 401;
        } else if (err.code === 'auth/argument-error') {
            errorMessage = 'Invalid token format.';
        } else if (err.code === 'auth/id-token-revoked') {
            errorMessage = 'Token has been revoked. Please login again.';
            statusCode = 403;
        }
        res.status( 400 ).json({ message: 'Invalid token.' })
    }
}
