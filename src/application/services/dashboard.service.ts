import { DashboardRepository } from '../ports/dashboard.repository'

export class DashbService {

    constructor(private readonly dashbRepo: DashboardRepository){}

    getData = async (): Promise<any> => {
        try {
            const [cardData, visitData] = await Promise.all([
                this.dashbRepo.fetchCardData(),
                this.dashbRepo.fetchVisits()
            ])
            return {
                cardData,
                visitData
            }
        } catch ( err ) {
            throw err
        }
    }

}
