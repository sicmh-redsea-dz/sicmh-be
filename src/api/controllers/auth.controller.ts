import { NextFunction, Request, Response } from 'express'
import { AuthService } from '../../application/services/auth.service'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { generateToken } from '../../utils/jwtUtils'

const throwValidationError = (message: string) => {
  const error: any = new Error(message)
  error.name = 'validation_errors'
  error.errors = [{ msg: message }]
  throw error
}

export class AuthController {
  private readonly authService: AuthService

  constructor() {
    this.authService = ServiceContainer.getAuthService()
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password } = req.body ?? {}
    try {
      if (!email || !password) throwValidationError('Email and password are required.')

      const registeredUser = await this.authService.register({ name, email, password })
      const token = generateToken(registeredUser._id)
      res.status(202).json({ user: registeredUser, token })
    } catch (err) {
      next(err)
    }
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body ?? {}
    try {
      if (!email || !password) throwValidationError('Email and password are required.')

      const loggedUser = await this.authService.login({ email, password })
      const token = generateToken(loggedUser._id)
      res.status(202).json({ user: loggedUser, token })
    } catch (err) {
      next(err)
    }
  }

  checkToken = async (req: Request, res: Response, next: NextFunction) => {
    const { uid } = (req as any).user
    try {
      const currentUser = await this.authService.checkToken(Number(uid))
      res.status(200).json({ user: currentUser })
    } catch (err) {
      next(err)
    }
  }

  completePasswordChange = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ updated: true })
    } catch (err) {
      next(err)
    }
  }
}
