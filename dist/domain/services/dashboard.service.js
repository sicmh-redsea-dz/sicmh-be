"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashbService = void 0;
const Database_1 = require("../../infrastructure/database/Database");
const dashboard_queries_1 = require("../../infrastructure/database/queries/dashboard.queries");
class DashbService {
    constructor() {
        this.getData = async () => {
            let cardQ = (0, dashboard_queries_1.dashbQueries)('cards');
            let visitQ = (0, dashboard_queries_1.dashbQueries)('visits');
            try {
                const cardResp = await Database_1.Database.execute(cardQ);
                const visitResp = await Database_1.Database.execute(visitQ);
                return {
                    cardData: cardResp[0].dashboard,
                    visitData: visitResp
                };
            }
            catch (err) {
                throw err;
            }
        };
    }
}
exports.DashbService = DashbService;
