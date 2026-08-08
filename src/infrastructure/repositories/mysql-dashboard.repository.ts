import { DashboardRepository } from '../../application/ports/dashboard.repository'
import { Database } from '../database/Database'
import { dashbQueries } from '../database/queries/dashboard.queries'

export class MysqlDashboardRepository implements DashboardRepository {
    async fetchCardData(): Promise<any> {
        const query = dashbQueries('cards')
        try {
            const resp = await Database.execute<any>(query)
            return resp[0]?.dashboard ?? null
        } catch (err: any) {
            // Some newly provisioned tenant schemas do not have the dashboard
            // function yet. An empty dashboard is valid for those tenants.
            if (err?.code === 'ER_SP_DOES_NOT_EXIST') return null
            throw err
        }
    }

    async fetchVisits(): Promise<any> {
        const query = dashbQueries('visits')
        return Database.execute<any>(query)
    }
}
