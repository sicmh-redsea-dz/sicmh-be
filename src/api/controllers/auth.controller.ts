import { NextFunction, Request, Response } from "express";
import { AuthService } from "../../domain/services/auth.service";

export class AuthController {
    static register = async (req:Request, res:Response, next:NextFunction) => {
        const body = req.body
        try {
            const registeredUser = await AuthService.register( body )
            const { ...user } = registeredUser
            res.status( 202 ).json({
                user
            })
        } catch ( err ) {
            next( err )
        }
    }

    static login = async (req:Request, res:Response, next:NextFunction) => {
        const body = req.body
        try {
            const loggedUser = await AuthService.login( body )
            const { ...user } = loggedUser
            res.status( 202 ).json({
                user
            })
        } catch ( err ) {
            next( err )
        }
    }

    static googleLogin = async(req:Request, res:Response, next:NextFunction) => {
        const body = req.body
        try {
            const gLoggedUser = await AuthService.googleLogin( body )
            res.status( 202 ).json({
                user: gLoggedUser
            })
        } catch ( err ) {
            next( err )
        }
    }

    static checkToken = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = ( req as any ).user
        try {
            const currentUser = await AuthService.checkToken( id )
            const { ...user } = currentUser
            res.status( 200 ).json({
                user
            })
        } catch ( err ) {
            next( err )
        }
    }
}