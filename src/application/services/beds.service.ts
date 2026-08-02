import { randomUUID } from 'crypto'

import { BedsRepository } from '../ports/beds.repository'
import { AuditActor, BedAssignment, BedHistoryEntry, BedModule, BedRecord, BedStatus } from '../../domain/entities/Bed'
import { BillingService } from './billing.service'

interface BedPayload {
  code: string
  area?: string
  status?: BedStatus
}

interface AssignPayload {
  assignmentId?: string
  patientId: string
  patientName: string
  doctorId?: string
  doctorName?: string
  reason?: string
  notes?: string
  expectedDischarge?: string
}

interface ReleasePayload {
  reason?: string
  status?: BedStatus
}

const VALID_MODULES: BedModule[] = ['hospitalization', 'emergency']

export class BedsService {
  constructor(
    private readonly bedsRepo: BedsRepository,
    private readonly billingService?: BillingService
  ) {}

  getBeds = async (module: string) => {
    const moduleKey = this.assertModule(module)
    const store = await this.bedsRepo.load()
    return { beds: store[moduleKey].beds }
  }

  createBed = async (module: string, payload: BedPayload, actor?: AuditActor) => {
    const moduleKey = this.assertModule(module)
    const errors: string[] = []
    if (!payload.code || !payload.code.trim()) errors.push('El codigo de cama es requerido.')
    if (errors.length > 0) throw this.buildValidationError(errors)

    const beds = await this.bedsRepo.update((store) => {
      const moduleBeds = store[moduleKey].beds
      const id = randomUUID()
      const now = new Date().toISOString()

      const bed: BedRecord = {
        id,
        code: payload.code.trim(),
        area: payload.area?.trim() || '',
        status: payload.status ?? 'available',
        currentAssignment: null,
        history: [this.buildHistory('create', actor, { code: payload.code, area: payload.area, status: payload.status })]
      }

      moduleBeds.push(bed)
      store[moduleKey].updatedAt = now
      return moduleBeds
    })

    return { beds }
  }

  updateBed = async (module: string, bedId: string, payload: BedPayload, actor?: AuditActor) => {
    const moduleKey = this.assertModule(module)

    const beds = await this.bedsRepo.update((store) => {
      const moduleBeds = store[moduleKey].beds
      const bed = moduleBeds.find((b) => b.id === bedId)
      if (!bed) throw this.buildNotFoundError(`No bed found with id ${bedId}`)

      const prevStatus = bed.status
      bed.code = payload.code?.trim() || bed.code
      bed.area = payload.area?.trim() ?? bed.area
      if (payload.status) bed.status = payload.status

      bed.history.push(this.buildHistory('update', actor, { code: bed.code, area: bed.area, status: bed.status }))

      if (payload.status && payload.status !== prevStatus) {
        bed.history.push(this.buildHistory('status_change', actor, { from: prevStatus, to: payload.status }))
      }

      store[moduleKey].updatedAt = new Date().toISOString()
      return moduleBeds
    })

    return { beds }
  }

  assignBed = async (module: string, bedId: string, payload: AssignPayload, actor?: AuditActor) => {
    const moduleKey = this.assertModule(module)
    const errors: string[] = []
    if (!payload.patientId) errors.push('Paciente requerido para asignar cama.')
    if (!payload.patientName || !payload.patientName.trim()) errors.push('Nombre del paciente requerido.')
    if (errors.length > 0) throw this.buildValidationError(errors)

    const now = new Date().toISOString()

    const beds = await this.bedsRepo.update((store) => {
      const moduleBeds = store[moduleKey].beds
      const bed = moduleBeds.find((b) => b.id === bedId)
      if (!bed) throw this.buildNotFoundError(`No bed found with id ${bedId}`)

      const payloadData: BedAssignment = {
        assignmentId: payload.assignmentId || bed.currentAssignment?.assignmentId || randomUUID(),
        patientId: payload.patientId,
        patientName: payload.patientName.trim(),
        doctorId: payload.doctorId,
        doctorName: payload.doctorName?.trim() || undefined,
        reason: payload.reason?.trim() || undefined,
        notes: payload.notes?.trim() || undefined,
        expectedDischarge: payload.expectedDischarge || undefined,
        assignedAt: bed.currentAssignment?.assignedAt ?? now,
        updatedAt: bed.currentAssignment ? now : undefined
      }

      if (bed.currentAssignment) {
        const previous = bed.currentAssignment
        bed.currentAssignment = payloadData
        bed.history.push(this.buildHistory('update_assignment', actor, { previous, next: payloadData }))
      } else {
        bed.currentAssignment = payloadData
        bed.status = 'occupied'
        bed.history.push(this.buildHistory('assign', actor, { assignment: payloadData }))
      }

      store[moduleKey].updatedAt = now
      return moduleBeds
    })

    if (this.billingService) {
      try {
        await this.billingService.createMovement({
          patientId: payload.patientId,
          patientName: payload.patientName,
          toStation: moduleKey === 'hospitalization' ? 'hospitalizacion' : 'emergencia',
          occurredAt: now,
          source: 'bed',
          reference: { bedId }
        }, actor)
      } catch (err) {
        console.warn('billing movement error:', (err as any)?.message || err)
      }
    }

    return { beds }
  }

  releaseBed = async (module: string, bedId: string, payload?: ReleasePayload, actor?: AuditActor) => {
    const moduleKey = this.assertModule(module)
    const beds = await this.bedsRepo.update((store) => {
      const moduleBeds = store[moduleKey].beds
      const bed = moduleBeds.find((b) => b.id === bedId)
      if (!bed) throw this.buildNotFoundError(`No bed found with id ${bedId}`)
      if (!bed.currentAssignment) throw this.buildValidationError(['La cama no tiene asignacion activa.'])

      const now = new Date().toISOString()
      const releasedAssignment = { ...bed.currentAssignment, releasedAt: now }

      bed.currentAssignment = null
      bed.status = payload?.status ?? 'available'
      bed.history.push(this.buildHistory('release', actor, { assignment: releasedAssignment, reason: payload?.reason }))

      store[moduleKey].updatedAt = now
      return moduleBeds
    })

    return { beds }
  }

  private assertModule(module: string): BedModule {
    const normalized = module.trim() as BedModule
    if (!VALID_MODULES.includes(normalized)) {
      throw this.buildValidationError(['Modulo invalido para camas.'])
    }
    return normalized
  }

  private buildHistory(type: BedHistoryEntry['type'], actor?: AuditActor, details?: Record<string, any>): BedHistoryEntry {
    return {
      eventId: randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      actor,
      details
    }
  }

  private buildValidationError(messages: string[]) {
    const err: any = new Error('Validation error')
    err.name = 'validation_errors'
    err.errors = messages.map((msg) => ({ msg }))
    return err
  }

  private buildNotFoundError(message: string) {
    const err: any = new Error(message)
    err.name = 'not_found_error'
    return err
  }
}
