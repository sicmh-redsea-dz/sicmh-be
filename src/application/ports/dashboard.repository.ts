export interface DashboardRepository {
    fetchCardData(): Promise<any>
    fetchVisits(): Promise<any>
}
