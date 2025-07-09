import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";


const router = Router()

const inv = new InvoiceController()

router.get(
    '/raw',
    inv.rawData.bind( inv )
)

router.get(
    '/:id',
    inv.readOne.bind( inv )
)

router.post(
    '/create', 
    inv.create.bind( inv )
)

export { router as invoiceRoutes }