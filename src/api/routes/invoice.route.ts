import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";


const router = Router()

const inv = new InvoiceController()

router.get(
    '/generate-pdf',
    inv.generatePDF.bind( inv )
)
router.get(
    '/raw',
    inv.rawData.bind( inv )
)
router.get(
    '/',
    inv.read.bind( inv )
)
router.get(
    '/:id',
    inv.readOne.bind( inv )
)
router.patch(
    '/:id', 
    inv.updateOne.bind( inv )
)
router.post(
    '/create', 
    inv.create.bind( inv )
)
router.delete(
    '/:id', 
    inv.removeOne.bind( inv )
)

export { router as invoiceRoutes }