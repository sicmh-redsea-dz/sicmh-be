import { Router } from "express";
import { getInvoices } from "../controllers/invoice.controller";

const router = Router()

router.get('/', getInvoices)

export default router