import { Router } from "express";
import { AuthController } from '../controllers/auth.controller'
import { validateRegister } from '../validators/auth.validator'

const router = Router()

router.post('/register', validateRegister, AuthController.register)
// router.post('/login', validateLogin, login)

export { router as authRoutes }