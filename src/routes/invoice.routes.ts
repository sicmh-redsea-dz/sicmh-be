import { Router } from "express";
import { deleteInvoice, getDataForInvoice, getInvoices, getOneInvoice, newInvoice, updateExistingInvoice } from "../controllers/invoice.controller";
import { authenticateJwt } from "../middleware/auth.middleware";
import { authMiddleware } from "../api/middlewares/auth.middleware";

const router = Router()

router.get('/', authMiddleware, getInvoices)
router.get('/invoice/:id', authenticateJwt, getOneInvoice)
router.get('/new-invoice', authMiddleware, getDataForInvoice)
router.post('/new-invoice', authMiddleware, newInvoice)
router.patch('/invoice/:id', authenticateJwt, updateExistingInvoice)
router.delete('/:id', authenticateJwt, deleteInvoice)

export default router