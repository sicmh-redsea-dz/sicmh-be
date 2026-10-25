import { Request, Router } from 'express';
import { validateCreatePatient, validateEditPatient, validateDeletePatient } from '../validators/visits.validator'
import { VisitsController } from '../controllers/visits.controller';
import { ClinicalDocumentsController } from '../controllers/clinical-documents.controller';
import { requireAnyPermission, requirePermissions, requirePermissionsIf, requireVisitOriginPermission, requireInventoryLocationPermissions } from '../middlewares/permission.middleware'
import { CLINICAL_READ_PERMISSIONS, CLINICAL_UPDATE_PERMISSIONS, Permission } from '../permissions/permissions'
import { singleFileUpload } from '../middlewares/upload.middleware';

const router = Router()

const visitsController = new VisitsController()
const clinicalDocumentsController = new ClinicalDocumentsController()

// Emergencia/hospitalización/quirófano always allow inventory; consulta externa
// only does for tenants/roles granted the feature permission.
const consultaWithInventory = (req: Request) =>
    (req.body?.origin === 'visits' || (req as any).visitOrigin === 'visits' || (req as any).visitOriginalOrigin === 'visits') &&
    Array.isArray(req.body?.stockItems) &&
    req.body.stockItems.length > 0

const allVisitReadPermissions: Permission[] = ['visits.read', ...CLINICAL_READ_PERMISSIONS]

router.get(
    '/', 
    requireVisitOriginPermission('read', 'query'),
    visitsController.getVisits.bind( visitsController )
)
router.get(
    '/consent-templates',
    requireAnyPermission(allVisitReadPermissions),
    clinicalDocumentsController.listAvailableTemplates.bind(clinicalDocumentsController)
)
router.get(
    '/consent-templates/:templateId/context',
    requireAnyPermission(allVisitReadPermissions),
    clinicalDocumentsController.getDraftContext.bind(clinicalDocumentsController)
)
router.post(
    '/consent-templates/:templateId/print',
    requireAnyPermission(CLINICAL_UPDATE_PERMISSIONS),
    clinicalDocumentsController.printDraft
)
router.get(
    '/:id', 
    requireVisitOriginPermission('read', 'id'),
    visitsController.getVisit.bind( visitsController )
)
router.get(
    '/:id/prescription',
    requireVisitOriginPermission('read', 'id'),
    clinicalDocumentsController.getPrescription.bind(clinicalDocumentsController)
)
router.get(
    '/:id/consents',
    requireVisitOriginPermission('read', 'id'),
    clinicalDocumentsController.listVisitConsents.bind(clinicalDocumentsController)
)
router.get(
    '/:id/consents/:templateId/context',
    requireVisitOriginPermission('read', 'id'),
    clinicalDocumentsController.getVisitContext.bind(clinicalDocumentsController)
)
router.post(
    '/:id/consents/:templateId/accept',
    requireVisitOriginPermission('update', 'id'),
    requirePermissions('attachments.create'),
    clinicalDocumentsController.acceptVisit.bind(clinicalDocumentsController)
)
router.post(
    '/:id/consents/:templateId/print',
    requireVisitOriginPermission('update', 'id'),
    clinicalDocumentsController.printVisit
)
router.post(
    '/:id/consents/instances/:instanceId/physical',
    requireVisitOriginPermission('update', 'id'),
    requirePermissions('attachments.create'),
    singleFileUpload('file'),
    clinicalDocumentsController.uploadPhysical
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
    requireAnyPermission([...allVisitReadPermissions, ...CLINICAL_UPDATE_PERMISSIONS]),
    visitsController.getDoctors.bind( visitsController )
)

router.get(
    '/search/patients',
    requireAnyPermission([...allVisitReadPermissions, ...CLINICAL_UPDATE_PERMISSIONS]),
    visitsController.getPatients.bind( visitsController )
)

router.get(
    '/search/stock-items',
    requireAnyPermission([...allVisitReadPermissions, ...CLINICAL_UPDATE_PERMISSIONS]),
    requireInventoryLocationPermissions('stock'),
    visitsController.getStockItems.bind( visitsController )
)

export { router as visitsRoutes }
