import { Request, Response } from 'express'
import { AuthService } from '../services/auth.srvc'
import { pool } from '../config/database'

const authService = new AuthService(pool)

export const login = async (req: Request, res: Response ) => {
  const bodyParams = req.body
  try {
    const loggedInUser = await authService.login(bodyParams)
    const { token, ...user } = loggedInUser
    res.status(202).json({
      user: user,
      token: token
    })
  } catch( err: any ) {
    res.status(400).json({message: err.message})
  }
} 

export const register = async ( req: Request, res: Response ) => {
  const bodyParams = req.body
  try {
    const registeredUser =  await authService.register(bodyParams)
    const { token, ...user } = registeredUser
    res.status(201).json({
      user: user,
      token: token
    })
  } catch( err: any ) {
    res.status(400).json({message: err.message})
  }
}

export const checkToken = async( req: Request, res: Response ) => {
  const { id } = (req as any).user
  const currentUser = await authService.checkToken( id )
  const { token, ...user } = currentUser
  res.status(200).json({
    user,
    token
  })
}
