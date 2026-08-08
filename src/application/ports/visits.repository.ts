import { History, ShortHistory } from '../../domain/entities/History'
import { ShortPatient } from '../../domain/entities/Patient'
import { Staff } from '../../domain/entities/Staff'

export interface VisitsRepository {
    findAll(args: { limit: number; offset: number; term: string; ext: string }): Promise<ShortHistory[]>
    findAllUnbounded(args: { term: string; ext?: string }): Promise<ShortHistory[]>
    findById(id: number): Promise<History | null>
    findPrescriptionContext(id: number): Promise<any | null>
    create(data: Record<string, any>): Promise<number>
    update(id: number, data: Record<string, any>): Promise<number>
    softDelete(id: number): Promise<number>
    findDoctors(term: string): Promise<Staff[]>
    findPatients(term: string): Promise<ShortPatient[]>
    findStockItems(subinventoryId: number): Promise<any[]>
}
