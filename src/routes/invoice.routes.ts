import { Router } from "express";
import { getDataForInvoice, getInvoices, newInvoice } from "../controllers/invoice.controller";
import { authenticateJwt } from "../middleware/auth.middleware";

const router = Router()

router.get('/', authenticateJwt, getInvoices)
router.get('/new-invoice', authenticateJwt, getDataForInvoice)
router.post('/new-invoice', authenticateJwt, newInvoice)

export default router