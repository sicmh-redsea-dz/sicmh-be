import { PatientsService } from '../patients.service'
import { VisitsService } from '../visits.service'
import { StockService } from '../stock.services'
import { StaffService } from '../staff.service'

export class ServiceContainer {
    private static patientsService: PatientsService
    private static visitsService: VisitsService
    private static staffService: StaffService
    private static stockService: StockService

    static getVisitsService(): VisitsService {
        if (!this.visitsService) 
            this.visitsService = new VisitsService( 
                this.getStaffService(), 
                this.getPatientsService(),
                this.getStockService()
            )
        return this.visitsService;
    }

    static getStockService(): StockService {
        if ( !this.stockService )
            this.stockService = new StockService()
        return this.stockService
    }

    static getStaffService(): StaffService {
        if ( !this.staffService )
            this.staffService = new StaffService()
        return this.staffService
    }

    static getPatientsService(): PatientsService {
        if ( !this.patientsService )
            this.patientsService = new PatientsService()
        return this.patientsService
    }

}