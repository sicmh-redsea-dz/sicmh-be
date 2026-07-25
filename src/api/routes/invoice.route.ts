import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { requirePermissions } from '../middlewares/permission.middleware';
import { validateCreateInvoice, validateInvoiceNumberParam, validateUpdateInvoice } from '../validators/invoice.validator';


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
    validateInvoiceNumberParam,
    inv.readOne.bind( inv )
)
router.patch(
    '/:id',
    requirePermissions('invoice.update'),
    validateUpdateInvoice,
    inv.updateOne.bind( inv )
)
router.patch(
    '/:id/annul',
    requirePermissions('invoice.delete'),
    validateInvoiceNumberParam,
    inv.annulOne.bind( inv )
)
router.post(
    '/create',
    requirePermissions('invoice.create'),
    validateCreateInvoice,
    inv.create.bind( inv )
)
router.delete(
    '/:id',
    requirePermissions('invoice.delete'),
    validateInvoiceNumberParam,
    inv.removeOne.bind( inv )
)

export { router as invoiceRoutes }
