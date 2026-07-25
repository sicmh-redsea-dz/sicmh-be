import { Router } from 'express'
import { BillingController } from '../controllers/billing.controller'
import { requireAnyPermission, requirePermissions } from '../middlewares/permission.middleware'
import {
  validateCreateManualCharge,
  validateCreateMovement,
  validateLedgerIdParam,
  validateUpdateManualCharge
} from '../validators/billing.validator'

const router = Router()
const billing = new BillingController()

router.get(
  '/report',
  requirePermissions('invoice.read'),
  billing.getReport.bind(billing)
)

router.get(
  '/report/pdf',
  requirePermissions('invoice.read'),
  billing.generatePdf.bind(billing)
)
router.get(
  '/invoice/:invoiceNumber',
  requirePermissions('invoice.read'),
  billing.getInvoiceSnapshot.bind(billing)
)

router.post(
  '/movements',
  requireAnyPermission(['invoice.update', 'invoice.create']),
  validateCreateMovement,
  billing.createMovement.bind(billing)
)

router.post(
  '/ledger',
  requireAnyPermission(['invoice.update', 'invoice.create']),
  validateCreateManualCharge,
  billing.createManualCharge.bind(billing)
)

router.patch(
  '/ledger/:id',
  requirePermissions('invoice.update'),
  validateUpdateManualCharge,
  billing.updateManualCharge.bind(billing)
)

router.delete(
  '/ledger/:id',
  requirePermissions('invoice.delete'),
  validateLedgerIdParam,
  billing.deleteManualCharge.bind(billing)
)

export { router as billingRoutes }
