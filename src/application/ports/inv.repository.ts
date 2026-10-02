export interface InventoryRepository {
    findAll(pagination: { limit: number; offset: number; term: string }, subinvId: string | number): Promise<any[]>
    findById(id: string): Promise<any | null>
    transfer(data: { prodId: string; prodQty: number; fromLocId: string | number; toLocId: string | number }): Promise<any>
    create(data: Record<string, any>): Promise<string>
    update(id: string, data: Record<string, any>): Promise<number>
}
