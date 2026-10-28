import { DashboardRepository } from '../ports/dashboard.repository'

export class DashbService {

    constructor(private readonly dashbRepo: DashboardRepository){}

    getData = async (): Promise<any> => {
        try {
            const [cardData, visitData, dailyActivity] = await Promise.all([
                this.dashbRepo.fetchCardData(),
                this.dashbRepo.fetchVisits(),
                this.dashbRepo.fetchDailyActivity()
            ])
            return {
                cardData,
                visitData,
                dailyActivity
            }
        } catch ( err ) {
            throw err
        }
    }

}
