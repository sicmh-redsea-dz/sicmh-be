import { Router } from "express";
import { authMiddleware } from '../middlewares/auth.middleware'
import { AuthController } from '../controllers/auth.controller'
import { validateRegister, validateLogin } from '../validators/auth.validator'

const router = Router()

router.post('/register', validateRegister, AuthController.register)
router.post('/login', validateLogin, AuthController.login)
router.get('/check-token', authMiddleware, AuthController.checkToken)

export { router as authRoutes }