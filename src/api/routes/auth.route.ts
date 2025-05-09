import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware'
import { AuthController } from '../controllers/auth.controller'
import { validateRegister, validateLogin, validateGRegister, validateCheckUser } from '../validators/auth.validator'

const router = Router()

router.post('/register', validateRegister, AuthController.register)
router.post('/login', validateLogin, AuthController.login)
router.post('/check-user', validateCheckUser, AuthController.checkUser)
router.post('/gregister', validateGRegister, AuthController.googleResgister)
router.get('/check-token', authMiddleware, AuthController.checkToken)

export { router as authRoutes }