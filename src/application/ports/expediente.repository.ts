import { ExpedienteExtra } from '../../domain/entities/Expediente'

export interface ExpedienteRepository {
  findByHistoryId(id: number): Promise<ExpedienteExtra | null>
  upsert(historyId: number, data: ExpedienteExtra): Promise<void>
}
