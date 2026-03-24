import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { requirePermissions } from '../middlewares/permission.middleware';


const router = Router()

const inv = new InvoiceController()

router.get(
    '/generate-pdf/:term',
    requirePermissions('invoice.read'),
    inv.generatePDF.bind( inv )
)
router.get(
    '/raw',
    requirePermissions('invoice.read'),
    inv.rawData.bind( inv )
)
router.get(
    '/',
    requirePermissions('invoice.read'),
    inv.read.bind( inv )
)
router.get(
    '/:id',
    requirePermissions('invoice.read'),
    inv.readOne.bind( inv )
)
router.patch(
    '/:id', 
    requirePermissions('invoice.update'),
    inv.updateOne.bind( inv )
)
router.patch(
    '/:id/annul',
    requirePermissions('invoice.delete'),
    inv.annulOne.bind( inv )
)
router.post(
    '/create', 
    requirePermissions('invoice.create'),
    inv.create.bind( inv )
)
router.delete(
    '/:id', 
    requirePermissions('invoice.delete'),
    inv.removeOne.bind( inv )
)

export { router as invoiceRoutes }
