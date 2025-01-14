import { Router } from "express";
import { deleteInvoice, getDataForInvoice, getInvoices, getOneInvoice, newInvoice, updateExistingInvoice } from "../controllers/invoice.controller";
import { authenticateJwt } from "../middleware/auth.middleware";

const router = Router()

router.get('/', authenticateJwt, getInvoices)
router.get('/invoice/:id', authenticateJwt, getOneInvoice)
router.get('/new-invoice', authenticateJwt, getDataForInvoice)
router.post('/new-invoice', authenticateJwt, newInvoice)
router.patch('/invoice/:id', authenticateJwt, updateExistingInvoice)
router.delete('/:id', authenticateJwt, deleteInvoice)

export default router