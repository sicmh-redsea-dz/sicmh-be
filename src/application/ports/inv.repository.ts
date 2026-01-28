export interface InventoryRepository {
    findAll(pagination: { limit: number; offset: number; term: string }, subinvId: number): Promise<any[]>
    findById(id: string): Promise<any | null>
    transfer(data: { prodId: number; prodQty: number; fromLocId: number; toLocId: number }): Promise<any>
    create(data: Record<string, any>): Promise<number>
    update(id: number, data: Record<string, any>): Promise<number>
}
