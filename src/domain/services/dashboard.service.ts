import { Database } from "../../infrastructure/database/Database"
import { dashbQueries } from "../../infrastructure/database/queries/dashboard.queries"

export class DashbService {

    constructor(){}

    getData = async (): Promise<any> => {
        let cardQ = dashbQueries('cards')
        let visitQ = dashbQueries('visits')

        try {

            const cardResp = await Database.execute<any>( cardQ )
            const visitResp = await Database.execute<any>( visitQ )

            return {
                cardData: cardResp[0].dashboard,
                visitData: visitResp
            }
        } catch ( err ) {
            throw err
        }
    }

}