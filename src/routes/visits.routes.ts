import { Router } from 'express'
import { authenticateJwt } from '../middleware/auth.middleware'
import { getVisits } from '../controllers/visits.controller'

const router = Router()

router.get('/', authenticateJwt, getVisits)

export default router;