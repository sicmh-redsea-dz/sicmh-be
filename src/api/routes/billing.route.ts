import { Router } from 'express'
import { BillingController } from '../controllers/billing.controller'
import { requireAnyPermission, requirePermissions } from '../middlewares/permission.middleware'

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
  billing.createMovement.bind(billing)
)

router.post(
  '/ledger',
  requireAnyPermission(['invoice.update', 'invoice.create']),
  billing.createManualCharge.bind(billing)
)

router.patch(
  '/ledger/:id',
  requirePermissions('invoice.update'),
  billing.updateManualCharge.bind(billing)
)

router.delete(
  '/ledger/:id',
  requirePermissions('invoice.delete'),
  billing.deleteManualCharge.bind(billing)
)

export { router as billingRoutes }
