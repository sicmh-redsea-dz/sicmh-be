import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware'
import { AuthController } from '../controllers/auth.controller'
import { validateRegister, validateLogin, validateGRegister, validateCheckUser } from '../validators/auth.validator'

const router = Router()
const authController = new AuthController()

router.post('/register', validateRegister, authController.register.bind(authController))
router.post('/login', validateLogin, authController.login.bind(authController))
router.post('/check-user', validateCheckUser, authController.checkUser.bind(authController))
router.post('/gregister', validateGRegister, authController.googleResgister.bind(authController))
router.get('/check-token', authMiddleware, authController.checkToken.bind(authController))

export { router as authRoutes }
