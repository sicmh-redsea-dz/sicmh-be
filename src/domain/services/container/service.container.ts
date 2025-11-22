import { PatientsService } from '../patients.service'
import { VisitsService } from '../visits.service'
import { StockService } from '../stock.services'
import { StaffService } from '../staff.service'
import { DashbService } from '../dashboard.service'
import { InvoiceService } from '../invoice.service'
import { InvService } from '../inv.service'

export class ServiceContainer {
    private static patientsService: PatientsService
    private static visitsService: VisitsService
    private static staffService: StaffService
    private static stockService: StockService
    private static dashbService: DashbService
    private static invoiceService: InvoiceService
    private static invService: InvService

    static getVisitsService(): VisitsService {
        if (!this.visitsService) 
            this.visitsService = new VisitsService( 
                this.getStaffService(), 
                this.getPatientsService(),
                this.getStockService(),
                this.getInvoiceService()
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

    static getDashbService(): DashbService {
        if ( !this.dashbService )
            this.dashbService = new DashbService()
        return this.dashbService
    }

    static getInvoiceService(): InvoiceService {
        if (!this.invoiceService) {
            this.invoiceService = new InvoiceService( this.getPatientsService() )
        }
        return this.invoiceService
    }

    static getInvService(): InvService {
        if ( !this.invService ) {
            this.invService = new InvService()
        }
        return this.invService
    }

}