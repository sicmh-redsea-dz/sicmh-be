import { NextFunction, Request, Response } from 'express'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { Permission } from '../permissions/permissions'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import { TenantContext } from '../../infrastructure/database/TenantContext'
import { clinicalEncounters, encounterProducts, inventoryLocations, invoices, patientMovements } from '../../infrastructure/database/schema/tenant'
import { normalizeLocationReference } from '../../infrastructure/database/inventory-location'
import { getClinicalPermissionForOrigin } from '../permissions/permissions'

export const normalizeClinicalOrigin = (value: unknown): string | null => {
  const aliases: Record<string, string> = { visits: 'visits', outpatient: 'visits', consulta: 'visits',
    emergency: 'emergency', emergencia: 'emergency', hospitalization: 'hospitalization', hospitalizacion: 'hospitalization',
    oroom: 'oroom', 'o-room': 'oroom', operating_room: 'oroom', quirofano: 'oroom' }
  return typeof value === 'string' ? aliases[value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()] ?? null : null
}

export const permissionForLocationCode = (code: string): Permission | null => ({
  main: 'inventory.read', outpatient: 'visits.outpatient.read', emergency: 'visits.emergency.read',
  operating_room: 'visits.operating_room.read', hospitalization: 'visits.hospitalization.read',
}[code] as Permission | undefined) ?? null

export const requireInventoryLocationPermissions = (source: 'query' | 'transfer' | 'stock') =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await resolveUser(req)
      if (!user) { res.status(403).json({ message: 'Access denied.' }); return }
      ;(req as any).currentUser = user
      const references = source === 'transfer' ? [req.body?.origin ?? 'main', req.body?.subinv]
        : [source === 'stock' ? req.query.term : req.query.subinvId ?? 'main']
      const permissions = await resolveUserPermissions(user)
      for (const reference of references) {
        if (typeof reference !== 'string' && typeof reference !== 'number') {
          res.status(400).json({ message: 'Invalid inventory location.' }); return
        }
        const value = normalizeLocationReference(String(reference))
        const [location] = await TenantContext.getDb().select({ code: inventoryLocations.code }).from(inventoryLocations)
          .where(and(or(eq(inventoryLocations.id, value), eq(inventoryLocations.code, value)), isNull(inventoryLocations.deletedAt))).limit(1)
        const required = location && permissionForLocationCode(location.code)
        if (!required) { res.status(400).json({ message: 'Invalid inventory location.' }); return }
        const clinical = location.code === 'main' ? 'visits.outpatient.read' : required
        const allowed = source === 'stock'
          ? permissions.has(clinical as Permission) || permissions.has(clinical.replace('.read', '.update') as Permission)
          : permissions.has(required)
        if (!allowed) { res.status(403).json({ message: 'Access denied for this inventory location.' }); return }
      }
      next()
    } catch (error) { next(error) }
  }

/** Authoritative module/trail lookup; never authorize an existing visit from the request body. */
export const requireVisitOriginPermission = (action: 'read' | 'update', source: 'query' | 'body' | 'id' | 'module' | 'operating-room') =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await resolveUser(req)
      if (!user) { res.status(403).json({ message: 'Access denied.' }); return }
      ;(req as any).currentUser = user
      let origins: string[] = []
      if (source === 'id') {
        const db = TenantContext.getDb()
        const [row] = await db.select({ type: clinicalEncounters.type, episode: clinicalEncounters.careEpisodeId,
          invoiceEpisode: invoices.careEpisodeId }).from(clinicalEncounters)
          .leftJoin(invoices, eq(clinicalEncounters.invoiceId, invoices.id))
          .where(and(eq(clinicalEncounters.id, req.params.id), isNull(clinicalEncounters.deletedAt))).limit(1)
        if (!row) { res.status(404).json({ message: 'Visit not found.' }); return }
        const original = normalizeClinicalOrigin(row.type)
        ;(req as any).visitOriginalOrigin = original
        if (original) origins.push(original)
        if (action === 'update' && req.body?.stockItems !== undefined) {
          const permissions = await resolveUserPermissions(user)
          if (!original || !permissions.has(getClinicalPermissionForOrigin(original, 'update')!)) {
            res.status(403).json({ message: 'Inventory edits require access to the original care module.' }); return
          }
        }
        const episode = row.episode ?? row.invoiceEpisode
        const movements = await db.select({ from: patientMovements.fromStation, to: patientMovements.toStation }).from(patientMovements)
          .where(and(isNull(patientMovements.deletedAt), or(eq(patientMovements.clinicalEncounterId, req.params.id),
            episode ? eq(patientMovements.careEpisodeId, episode) : undefined)))
        for (const movement of movements) for (const station of [movement.from, movement.to]) {
          const origin = normalizeClinicalOrigin(station)
          if (origin && !origins.includes(origin)) origins.push(origin)
        }
        // Classification and invoice linkage cannot be changed through the clinical form.
        if (action === 'update' && (req.body?.visitType !== undefined || req.body?.invoiceId !== undefined)) {
          res.status(400).json({ message: 'Visit classification and invoice linkage are immutable.' }); return
        }
        if (action === 'update' && req.body?.origin !== undefined) {
          const requested = normalizeClinicalOrigin(req.body.origin)
          if (!requested || !origins.includes(requested)) { res.status(403).json({ message: 'Invalid visit module.' }); return }
          origins = [requested]
        }
      } else {
        const raw = source === 'query' ? req.query.ext || 'visits' : source === 'body' ? req.body?.origin
          : source === 'module' ? req.params.module : 'oroom'
        const origin = normalizeClinicalOrigin(raw)
        if (origin) origins = [origin]
        if (source === 'query' && origin) req.query.ext = origin
      }
      if (!origins.length) { res.status(400).json({ message: 'Invalid medical care module.' }); return }
      const permissions = await resolveUserPermissions(user)
      const allowed = origins.find(origin => permissions.has(getClinicalPermissionForOrigin(origin, action)!))
      if (!allowed) { res.status(403).json({ message: 'Access denied for this medical care module.' }); return }
      if (source === 'body' || (source === 'id' && action === 'update' && req.body?.origin !== undefined)) req.body.origin = allowed
      if (source === 'id' && action === 'update' && (req as any).visitOriginalOrigin === 'visits'
        && Array.isArray(req.body?.stockItems) && !permissions.has('visits.inventory.manage')) {
        const [used] = await TenantContext.getDb().select({ id: encounterProducts.id }).from(encounterProducts)
          .where(and(eq(encounterProducts.clinicalEncounterId, req.params.id), gt(encounterProducts.quantity, 0), isNull(encounterProducts.deletedAt))).limit(1)
        if (req.body.stockItems.length || used) { res.status(403).json({ message: 'Outpatient inventory feature is not enabled.' }); return }
      }
      ;(req as any).visitOrigin = allowed
      next()
    } catch (error) { next(error) }
  }

type RequiredPermissions = Permission | Permission[] | null | undefined
type PermissionMatchMode = 'all' | 'any'
type PermissionResolver = (req: Request) => RequiredPermissions

const resolveUser = async (req: Request) => {
  const currentUser = (req as any).currentUser
  if (currentUser) return currentUser

  const decoded = (req as any).user
  const uid = decoded?.uid
  if (!uid) return null

  const authService = ServiceContainer.getAuthService()
  return await authService.checkToken(String(uid))
}

// checkToken() already resolves and attaches permissions once; reuse that
// instead of re-querying the permission-override tables a second time.
const resolveUserPermissions = async (user: any): Promise<Set<Permission>> => {
  if (Array.isArray(user.permissions)) return new Set(user.permissions)
  const accessControl = ServiceContainer.getAccessControlService()
  return accessControl.resolvePermissions(user.roles ?? [], String(user._id))
}

const toPermissionList = (required: RequiredPermissions): Permission[] => {
  if (!required) return []
  return Array.isArray(required) ? required : [required]
}

const validatePermissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
  requiredList: Permission[],
  mode: PermissionMatchMode
) => {
  try {
    const user = await resolveUser(req)
    if (!user) {
      res.status(403).json({ message: 'Access denied. User not found.' })
      return
    }

    ;(req as any).currentUser = user

    const permissions = await resolveUserPermissions(user)
    const allowed = mode === 'all'
      ? requiredList.every((permission) => permissions.has(permission))
      : requiredList.some((permission) => permissions.has(permission))

    if (!allowed) {
      res.status(403).json({ message: 'Access denied. Insufficient permissions.' })
      return
    }

    next()
  } catch (error) {
    const label = mode === 'all' ? 'requirePermissions' : 'requireAnyPermission'
    console.error(`[${label}] error:`, error)
    res.status(500).json({ message: 'Unable to validate permissions. Please try again.' })
  }
}

const buildResolvedPermissionGuard = (
  resolver: PermissionResolver,
  mode: PermissionMatchMode,
  fallback?: RequiredPermissions
) => {
  const fallbackList = toPermissionList(fallback)

  return async (req: Request, res: Response, next: NextFunction) => {
    const resolved = toPermissionList(resolver(req))
    const requiredList = resolved.length > 0 ? resolved : fallbackList

    if (requiredList.length === 0) {
      next()
      return
    }

    await validatePermissions(req, res, next, requiredList, mode)
  }
}

export const requirePermissions = (required: Permission | Permission[]) => {
  const requiredList = Array.isArray(required) ? required : [required]
  return async (req: Request, res: Response, next: NextFunction) => {
    await validatePermissions(req, res, next, requiredList, 'all')
  }
}

export const requirePermissionsIf = (
  predicate: (req: Request) => boolean,
  required: Permission | Permission[]
) => {
  const guard = requirePermissions(required)

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!predicate(req)) {
      next()
      return
    }
    await guard(req, res, next)
  }
}

export const requireAnyPermission = (required: Permission | Permission[]) => {
  const requiredList = Array.isArray(required) ? required : [required]
  return async (req: Request, res: Response, next: NextFunction) => {
    await validatePermissions(req, res, next, requiredList, 'any')
  }
}

export const requireResolvedPermissions = (
  resolver: PermissionResolver,
  fallback?: RequiredPermissions
) => buildResolvedPermissionGuard(resolver, 'all', fallback)

export const requireResolvedAnyPermission = (
  resolver: PermissionResolver,
  fallback?: RequiredPermissions
) => buildResolvedPermissionGuard(resolver, 'any', fallback)
