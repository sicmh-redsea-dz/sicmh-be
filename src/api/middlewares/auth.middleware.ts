import { NextFunction, Request, Response } from 'express'
import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { join } from 'path'

// import { verifyToken } from '../../config/jwt';

const serviceAccountPath = join(__dirname, 'sampleapp-d2514-firebase-adminsdk-fbsvc-339751be6c.json');
const serviceAccount = JSON.parse(
    readFileSync(
        serviceAccountPath, 
        'utf-8'
    )
)

admin.initializeApp({
    credential: admin.credential.cert( serviceAccount )
})

// export const authMiddleware = (req:Request, res:Response, next: NextFunction) => {
//     const token = req.header('Authorization')?.replace('Bearer ', '')
//     if ( !token ) {
//         res.status( 401 ).json({ message: 'Access denied. No token provided.'})
//         return 
//     }

//     try{
//         const decoded = verifyToken(token);
//         ( req as any ).user = decoded
//         next()
//     } catch ( err ) {
//         res.status( 400 ).json({ message: 'Invalid token.' })
//     }
// }


export const authMiddleware = async (req:Request, res:Response, next:NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if ( !token ) {
        res.status( 401 ).json({ message: 'Access denied. No token provided.'})
        return 
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken( token );
        ( req as any ).user = decodedToken
        next()
    } catch ( err ) {
        res.status( 400 ).json({ message: 'Invalid token.' })
    }
}
