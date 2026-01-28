import { NextFunction, Request, Response } from "express";
import { AuthService } from "../../application/services/auth.service";
import { ServiceContainer } from "../../infrastructure/container/service.container";

export class AuthController {
    private readonly authService: AuthService

    constructor() {
        this.authService = ServiceContainer.getAuthService()
    }

    register = async (req:Request, res:Response, next:NextFunction) => {
        const body = req.body
        try {
            const registeredUser = await this.authService.register( body )
            const { ...user } = registeredUser
            res.status( 202 ).json({
                user
            })
        } catch ( err ) {
            next( err )
        }
    }

    login = async (req:Request, res:Response, next:NextFunction) => {
        const body = req.body
        try {
            const loggedUser = await this.authService.login( body )
            const { ...user } = loggedUser
            res.status( 202 ).json({
                user
            })
        } catch ( err ) {
            next( err )
        }
    }

    checkUser = async (req:Request, res:Response, next:NextFunction) => {
        const { uid } = req.body
        try{
            const { exists, user } = await this.authService.checkUser( uid )
            res.status( 200 ).json({
                user,
                exists
            })
        } catch ( err ) {
            next( err )
        }
    }

    googleResgister = async(req:Request, res:Response, next:NextFunction) => {
        const body = req.body
        try {
            const user = await this.authService.googleRegister( body )
            res.status( 202 ).json({
                user
            })
        } catch ( err ) {
            next( err )
        }
    }

    checkToken = async (req:Request, res:Response, next:NextFunction) => {
        const { uid:id } = ( req as any ).user
        try {
            const currentUser = await this.authService.checkToken( id )
            const { ...user } = currentUser
            res.status( 200 ).json({
                user
            })
        } catch ( err ) {
            next( err )
        }
    }
}
