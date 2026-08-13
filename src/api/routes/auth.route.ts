import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import { AuthController } from '../controllers/auth.controller'
import { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } from '../validators/auth.validator'

const router = Router()
const authController = new AuthController()

router.post('/register', validateRegister, authController.register.bind(authController))
router.post('/login', validateLogin, authController.login.bind(authController))
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword.bind(authController))
router.post('/reset-password', validateResetPassword, authController.resetPassword.bind(authController))
router.get('/check-token', authMiddleware, authController.checkToken.bind(authController))
router.post('/complete-password-change', authMiddleware, authController.completePasswordChange.bind(authController))

export { router as authRoutes }
