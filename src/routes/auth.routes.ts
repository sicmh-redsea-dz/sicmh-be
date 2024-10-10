import { Router } from 'express';
import { authenticateJwt } from '../middleware/auth.middleware'
import { register, login, checkToken } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login)
router.get('/check-token', authenticateJwt, checkToken)

export default router;