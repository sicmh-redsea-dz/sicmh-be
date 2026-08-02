import { ExpedienteExtra } from '../../domain/entities/Expediente'

export interface ExpedienteRepository {
  findByHistoryId(id: string): Promise<ExpedienteExtra | null>
  upsert(historyId: string, data: ExpedienteExtra): Promise<void>
}
