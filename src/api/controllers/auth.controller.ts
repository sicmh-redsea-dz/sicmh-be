import { NextFunction, Request, Response } from "express";
import { AuthService } from "../../domain/services/auth.service";

export class AuthController {
    static async register(req:Request, res:Response, next:NextFunction) {
        const body = req.body
        try {
            const registeredUser = await AuthService.register( body )
            const { token, ...user } = registeredUser
            res.status( 202 ).json({
                user: user,
                token
            })
        } catch ( err ) {
            next( err )
        }
    }
}