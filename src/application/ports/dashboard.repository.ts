export interface DashboardDailyPoint {
    date: string
    visits: number
    newPatients: number
}

export interface DashboardRepository {
    fetchCardData(): Promise<any>
    fetchVisits(): Promise<any>
    fetchDailyActivity(): Promise<DashboardDailyPoint[]>
}
