import { Request, Router } from 'express';
import { validateCreatePatient, validateEditPatient, validateDeletePatient } from '../validators/visits.validator'
import { VisitsController } from '../controllers/visits.controller';
import { ClinicalDocumentsController } from '../controllers/clinical-documents.controller';
import { requireAnyPermission, requirePermissions, requirePermissionsIf, requireResolvedAnyPermission } from '../middlewares/permission.middleware'
import { CLINICAL_READ_PERMISSIONS, CLINICAL_UPDATE_PERMISSIONS, getClinicalPermissionForOrigin, Permission } from '../permissions/permissions'
import { singleFileUpload } from '../middlewares/upload.middleware';

const router = Router()

const visitsController = new VisitsController()
const clinicalDocumentsController = new ClinicalDocumentsController()

// Emergencia/hospitalización/quirófano always allow inventory; consulta externa
// only does for tenants/roles granted the feature permission.
const consultaWithInventory = (req: Request) =>
    req.body?.origin === 'visits' &&
    Array.isArray(req.body?.stockItems) &&
    req.body.stockItems.length > 0

const resolveReadPermission = (req: Request): Permission[] => {
    const ext = String(req.query.ext ?? '').trim()
    const derived = getClinicalPermissionForOrigin(ext || 'visits', 'read')
    return derived ? ['visits.read', derived] : ['visits.read', ...CLINICAL_READ_PERMISSIONS]
}

const resolveUpdatePermission = (req: Request): Permission[] => {
    const derived = getClinicalPermissionForOrigin(String(req.body?.origin ?? ''), 'update')
    return derived ? ['visits.update', 'visits.create', derived] : ['visits.update', 'visits.create', ...CLINICAL_UPDATE_PERMISSIONS]
}

const allVisitReadPermissions: Permission[] = ['visits.read', ...CLINICAL_READ_PERMISSIONS]

router.get(
    '/', 
    requireResolvedAnyPermission(resolveReadPermission, allVisitReadPermissions),
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
    requireAnyPermission(allVisitReadPermissions),
    clinicalDocumentsController.printDraft
)
router.get(
    '/:id', 
    requireAnyPermission(allVisitReadPermissions),
    visitsController.getVisit.bind( visitsController )
)
router.get(
    '/:id/prescription',
    requireAnyPermission(allVisitReadPermissions),
    clinicalDocumentsController.getPrescription.bind(clinicalDocumentsController)
)
router.get(
    '/:id/consents',
    requireAnyPermission(allVisitReadPermissions),
    clinicalDocumentsController.listVisitConsents.bind(clinicalDocumentsController)
)
router.get(
    '/:id/consents/:templateId/context',
    requireAnyPermission(allVisitReadPermissions),
    clinicalDocumentsController.getVisitContext.bind(clinicalDocumentsController)
)
router.post(
    '/:id/consents/:templateId/accept',
    requireAnyPermission(allVisitReadPermissions),
    clinicalDocumentsController.acceptVisit.bind(clinicalDocumentsController)
)
router.post(
    '/:id/consents/:templateId/print',
    requireAnyPermission(allVisitReadPermissions),
    clinicalDocumentsController.printVisit
)
router.post(
    '/:id/consents/instances/:instanceId/physical',
    requireAnyPermission(allVisitReadPermissions),
    singleFileUpload('file'),
    clinicalDocumentsController.uploadPhysical
)
router.post(
    '/create',
    requireResolvedAnyPermission(resolveUpdatePermission, ['visits.create', 'visits.update', ...CLINICAL_UPDATE_PERMISSIONS]),
    requirePermissionsIf(consultaWithInventory, 'visits.inventory.manage'),
    validateCreatePatient,
    visitsController.createVisit.bind( visitsController )
)
router.patch(
    '/edit/:id',
    requireResolvedAnyPermission(resolveUpdatePermission, ['visits.update', ...CLINICAL_UPDATE_PERMISSIONS]),
    requirePermissionsIf(consultaWithInventory, 'visits.inventory.manage'),
    validateEditPatient,
    visitsController.editVisit.bind( visitsController )
)
router.delete(
    '/:id', 
    requirePermissions('visits.delete'),
    validateDeletePatient,
    visitsController.deleteVisit.bind( visitsController )
)
router.get(
    '/search/doctors',
    requireAnyPermission(allVisitReadPermissions),
    visitsController.getDoctors.bind( visitsController )
)

router.get(
    '/search/patients',
    requireAnyPermission(allVisitReadPermissions),
    visitsController.getPatients.bind( visitsController )
)

router.get(
    '/search/stock-items',
    requireAnyPermission(allVisitReadPermissions),
    visitsController.getStockItems.bind( visitsController )
)

export { router as visitsRoutes }
