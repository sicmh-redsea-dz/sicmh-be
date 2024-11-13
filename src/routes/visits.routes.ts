import { Router } from 'express'
import { authenticateJwt } from '../middleware/auth.middleware'
import { getVisits, createVisit, editVisit, getOneVisit, softDeleteVisit } from '../controllers/visits.controller'

const router = Router()

router.get('/', authenticateJwt, getVisits)
router.get('/:id', authenticateJwt, getOneVisit)
router.post('/create', authenticateJwt, createVisit)
router.patch('/edit-visit/:id', authenticateJwt, editVisit)
router.delete('/:id', authenticateJwt, softDeleteVisit)

export default router;