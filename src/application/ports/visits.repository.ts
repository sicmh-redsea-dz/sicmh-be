import { History, ShortHistory } from '../../domain/entities/History'
import { ShortPatient } from '../../domain/entities/Patient'
import { Staff } from '../../domain/entities/Staff'

export interface VisitsRepository {
    findAll(args: { limit: number; offset: number; term: string; ext: string }): Promise<ShortHistory[]>
    findAllUnbounded(args: { term: string; ext?: string }): Promise<ShortHistory[]>
    findById(id: string): Promise<History | null>
    create(data: Record<string, any>): Promise<string>
    update(id: string, data: Record<string, any>): Promise<number>
    softDelete(id: string): Promise<number>
    findDoctors(term: string): Promise<Staff[]>
    findPatients(term: string): Promise<ShortPatient[]>
    findStockItems(subinventoryId: string): Promise<any[]>
}
