import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { AuthController } from '../controllers/auth.controller';
import { validateRegister, validateLogin } from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

router.post('/register', authMiddleware, validateRegister, authController.register.bind(authController));
router.post('/login', authMiddleware, validateLogin, authController.login.bind(authController));
router.get('/check-token', authMiddleware, authController.checkToken.bind(authController));

export { router as authRoutes };
