import { Router } from "express";
import { deleteInvoice, getDataForInvoice, getInvoices, getOneInvoice, newInvoice, updateExistingInvoice } from "../controllers/invoice.controller";
import { authMiddleware } from "../api/middlewares/auth.middleware";

const router = Router()

router.get('/', authMiddleware, getInvoices)
router.get('/invoice/:id', authMiddleware, getOneInvoice)
router.get('/new-invoice', authMiddleware, getDataForInvoice)
router.post('/new-invoice', authMiddleware, newInvoice)
router.patch('/invoice/:id', authMiddleware, updateExistingInvoice)
router.delete('/:id', authMiddleware, deleteInvoice)

export default router