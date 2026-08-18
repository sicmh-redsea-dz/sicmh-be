import { Request, Router } from 'express';
import { validateCreatePatient, validateEditPatient, validateDeletePatient } from '../validators/visits.validator'
import { VisitsController } from '../controllers/visits.controller';
import { requireAnyPermission, requirePermissions, requirePermissionsIf, requireVisitOriginPermission } from '../middlewares/permission.middleware'
import { CLINICAL_READ_PERMISSIONS, CLINICAL_UPDATE_PERMISSIONS } from '../permissions/permissions'
import { ConsentsController } from '../controllers/consents.controller'
import { singleFileUpload } from '../middlewares/upload.middleware'

const router = Router()

const visitsController = new VisitsController()
const consentsController = new ConsentsController()

// Emergencia/hospitalización/quirófano always allow inventory; consulta externa
// only does for tenants/roles granted the feature permission.
const consultaWithInventory = (req: Request) =>
    (req.body?.origin === 'visits' || (req as any).visitOrigin === 'consulta') &&
    Array.isArray(req.body?.stockItems) &&
    req.body.stockItems.length > 0

router.get(
    '/', 
    requireVisitOriginPermission('read', 'query'),
    visitsController.getVisits.bind( visitsController )
)
router.get(
    '/consent-templates',
    requireAnyPermission(CLINICAL_READ_PERMISSIONS),
    consentsController.listTemplates.bind(consentsController)
)
router.get(
    '/consent-templates/:templateId/context',
    requireAnyPermission(CLINICAL_READ_PERMISSIONS),
    consentsController.draftContext.bind(consentsController)
)
router.post(
    '/consent-templates/:templateId/print',
    requireAnyPermission(CLINICAL_UPDATE_PERMISSIONS),
    consentsController.draftPrint.bind(consentsController)
)
router.get(
    '/:id/prescription',
    requireVisitOriginPermission('read', 'id'),
    visitsController.getPrescription.bind(visitsController)
)
router.get(
    '/:id/consents',
    requireVisitOriginPermission('read', 'id'),
    consentsController.listByVisit.bind(consentsController)
)
router.get(
    '/:id/consents/:templateId/context',
    requireVisitOriginPermission('read', 'id'),
    consentsController.context.bind(consentsController)
)
router.get(
    '/:id/consents/:templateId/preview',
    requireVisitOriginPermission('read', 'id'),
    consentsController.preview.bind(consentsController)
)
router.post(
    '/:id/consents/:templateId/print',
    requireVisitOriginPermission('update', 'id'),
    consentsController.print.bind(consentsController)
)
router.post(
    '/:id/consents/:templateId/accept',
    requireVisitOriginPermission('update', 'id'),
    requirePermissions('attachments.create'),
    consentsController.accept.bind(consentsController)
)
router.post(
    '/:id/consents/instances/:instanceId/physical',
    requireVisitOriginPermission('update', 'id'),
    requirePermissions('attachments.create'),
    singleFileUpload('file'),
    consentsController.acceptPhysical.bind(consentsController)
)
router.get(
    '/:id', 
    requireVisitOriginPermission('read', 'id'),
    visitsController.getVisit.bind( visitsController )
)
router.post(
    '/create',
    requireVisitOriginPermission('update', 'body'),
    requirePermissionsIf(consultaWithInventory, 'visits.inventory.manage'),
    validateCreatePatient,
    visitsController.createVisit.bind( visitsController )
)
router.patch(
    '/edit/:id',
    requireVisitOriginPermission('update', 'id'),
    requirePermissionsIf(consultaWithInventory, 'visits.inventory.manage'),
    validateEditPatient,
    visitsController.editVisit.bind( visitsController )
)
router.delete(
    '/:id', 
    requireVisitOriginPermission('update', 'id'),
    requirePermissions('visits.delete'),
    validateDeletePatient,
    visitsController.deleteVisit.bind( visitsController )
)
router.get(
    '/search/doctors',
    requireAnyPermission(CLINICAL_READ_PERMISSIONS),
    visitsController.getDoctors.bind( visitsController )
)

router.get(
    '/search/patients',
    requireAnyPermission(CLINICAL_READ_PERMISSIONS),
    visitsController.getPatients.bind( visitsController )
)

router.get(
    '/search/stock-items',
    requireAnyPermission(CLINICAL_READ_PERMISSIONS),
    visitsController.getStockItems.bind( visitsController )
)

export { router as visitsRoutes }
