import { and, count, desc, gte, isNull, lt } from 'drizzle-orm'
import { DashboardRepository } from '../../application/ports/dashboard.repository'
import { TenantContext } from '../database/TenantContext'
import { clinicalEncounters, invoices, patients } from '../database/schema/tenant'

const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

export class MysqlDashboardRepository implements DashboardRepository {
  async fetchCardData(): Promise<Record<string, number | null>> {
    const db = TenantContext.getDb()
    const currentStart = monthStart(new Date())
    const nextStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1)
    const previousStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1)
    const [activePatients, currentInvoices, previousInvoices, currentVisits, previousVisits] = await Promise.all([
      db.select({ value: count() }).from(patients).where(isNull(patients.deletedAt)),
      db.select({ value: count() }).from(invoices).where(and(
        isNull(invoices.deletedAt),
        gte(invoices.issuedAt, currentStart),
        lt(invoices.issuedAt, nextStart),
      )),
      db.select({ value: count() }).from(invoices).where(and(
        isNull(invoices.deletedAt),
        gte(invoices.issuedAt, previousStart),
        lt(invoices.issuedAt, currentStart),
      )),
      db.select({ value: count() }).from(clinicalEncounters).where(and(
        isNull(clinicalEncounters.deletedAt),
        gte(clinicalEncounters.occurredAt, currentStart),
        lt(clinicalEncounters.occurredAt, nextStart),
      )),
      db.select({ value: count() }).from(clinicalEncounters).where(and(
        isNull(clinicalEncounters.deletedAt),
        gte(clinicalEncounters.occurredAt, previousStart),
        lt(clinicalEncounters.occurredAt, currentStart),
      )),
    ])
    const variation = (current: number, previous: number) =>
      previous === 0 ? null : Math.round(((current - previous) * 1000) / previous) / 10
    return {
      pacientes_actuales: activePatients[0]?.value ?? 0,
      pacientes_variacion: 0,
      facturas_actuales: currentInvoices[0]?.value ?? 0,
      facturas_variacion: variation(currentInvoices[0]?.value ?? 0, previousInvoices[0]?.value ?? 0),
      visitas_actuales: currentVisits[0]?.value ?? 0,
      visitas_variacion: variation(currentVisits[0]?.value ?? 0, previousVisits[0]?.value ?? 0),
    }
  }

  async fetchVisits(): Promise<Array<Record<string, unknown>>> {
    return TenantContext.getDb()
      .select({
        id: clinicalEncounters.id,
        date: clinicalEncounters.occurredAt,
        type: clinicalEncounters.type,
        patientId: clinicalEncounters.patientId,
      })
      .from(clinicalEncounters)
      .where(isNull(clinicalEncounters.deletedAt))
      .orderBy(desc(clinicalEncounters.occurredAt))
      .limit(10)
  }
}
