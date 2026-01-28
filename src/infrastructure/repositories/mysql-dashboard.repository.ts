import { DashboardRepository } from '../../application/ports/dashboard.repository'
import { Database } from '../database/Database'
import { dashbQueries } from '../database/queries/dashboard.queries'

export class MysqlDashboardRepository implements DashboardRepository {
    async fetchCardData(): Promise<any> {
        const query = dashbQueries('cards')
        const resp = await Database.execute<any>(query)
        return resp[0]?.dashboard
    }

    async fetchVisits(): Promise<any> {
        const query = dashbQueries('visits')
        return Database.execute<any>(query)
    }
}
