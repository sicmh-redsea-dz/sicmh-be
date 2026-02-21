import { AuthService } from '../../application/services/auth.service'
import { PatientsService } from '../../application/services/patients.service'
import { VisitsService } from '../../application/services/visits.service'
import { StockService } from '../../application/services/stock.services'
import { StaffService } from '../../application/services/staff.service'
import { DashbService } from '../../application/services/dashboard.service'
import { InvoiceService } from '../../application/services/invoice.service'
import { InvService } from '../../application/services/inv.service'
import { MysqlAuthRepository } from '../repositories/mysql-auth.repository'
import { MysqlPatientsRepository } from '../repositories/mysql-patients.repository'
import { MysqlVisitsRepository } from '../repositories/mysql-visits.repository'
import { MysqlStockRepository } from '../repositories/mysql-stock.repository'
import { MysqlStaffRepository } from '../repositories/mysql-staff.repository'
import { MysqlDashboardRepository } from '../repositories/mysql-dashboard.repository'
import { MysqlInvoiceRepository } from '../repositories/mysql-invoice.repository'
import { MysqlInvRepository } from '../repositories/mysql-inv.repository'
import { FileExpedienteRepository } from '../repositories/file-expediente.repository'

export class ServiceContainer {
    private static authService: AuthService
    private static patientsService: PatientsService
    private static visitsService: VisitsService
    private static staffService: StaffService
    private static stockService: StockService
    private static dashbService: DashbService
    private static invoiceService: InvoiceService
    private static invService: InvService
    private static authRepo: MysqlAuthRepository
    private static patientsRepo: MysqlPatientsRepository
    private static visitsRepo: MysqlVisitsRepository
    private static stockRepo: MysqlStockRepository
    private static staffRepo: MysqlStaffRepository
    private static dashbRepo: MysqlDashboardRepository
    private static invoiceRepo: MysqlInvoiceRepository
    private static invRepo: MysqlInvRepository
    private static expedienteRepo: FileExpedienteRepository

    static getAuthService(): AuthService {
        if (!this.authService)
            this.authService = new AuthService( this.getAuthRepository() )
        return this.authService
    }

    static getVisitsService(): VisitsService {
        if (!this.visitsService) 
            this.visitsService = new VisitsService( 
                this.getStaffService(), 
                this.getPatientsService(),
                this.getStockService(),
                this.getInvoiceService(),
                this.getVisitsRepository(),
                this.getExpedienteRepository()
            )
        return this.visitsService;
    }

    static getStockService(): StockService {
        if ( !this.stockService )
            this.stockService = new StockService( this.getStockRepository() )
        return this.stockService
    }

    static getStaffService(): StaffService {
        if ( !this.staffService )
            this.staffService = new StaffService( this.getStaffRepository() )
        return this.staffService
    }

    static getPatientsService(): PatientsService {
        if ( !this.patientsService )
            this.patientsService = new PatientsService( this.getPatientsRepository() )
        return this.patientsService
    }

    static getDashbService(): DashbService {
        if ( !this.dashbService )
            this.dashbService = new DashbService( this.getDashboardRepository() )
        return this.dashbService
    }

    static getInvoiceService(): InvoiceService {
        if (!this.invoiceService) {
            this.invoiceService = new InvoiceService( this.getPatientsService(), this.getInvoiceRepository() )
        }
        return this.invoiceService
    }

    static getInvService(): InvService {
        if ( !this.invService ) {
            this.invService = new InvService( this.getInvRepository() )
        }
        return this.invService
    }

    private static getAuthRepository(): MysqlAuthRepository {
        if ( !this.authRepo )
            this.authRepo = new MysqlAuthRepository()
        return this.authRepo
    }

    private static getPatientsRepository(): MysqlPatientsRepository {
        if ( !this.patientsRepo )
            this.patientsRepo = new MysqlPatientsRepository()
        return this.patientsRepo
    }

    private static getVisitsRepository(): MysqlVisitsRepository {
        if ( !this.visitsRepo )
            this.visitsRepo = new MysqlVisitsRepository()
        return this.visitsRepo
    }

    private static getStockRepository(): MysqlStockRepository {
        if ( !this.stockRepo )
            this.stockRepo = new MysqlStockRepository()
        return this.stockRepo
    }

    private static getStaffRepository(): MysqlStaffRepository {
        if ( !this.staffRepo )
            this.staffRepo = new MysqlStaffRepository()
        return this.staffRepo
    }

    private static getDashboardRepository(): MysqlDashboardRepository {
        if ( !this.dashbRepo )
            this.dashbRepo = new MysqlDashboardRepository()
        return this.dashbRepo
    }

    private static getInvoiceRepository(): MysqlInvoiceRepository {
        if ( !this.invoiceRepo )
            this.invoiceRepo = new MysqlInvoiceRepository()
        return this.invoiceRepo
    }

    private static getExpedienteRepository(): FileExpedienteRepository {
        if ( !this.expedienteRepo )
            this.expedienteRepo = new FileExpedienteRepository()
        return this.expedienteRepo
    }

    private static getInvRepository(): MysqlInvRepository {
        if ( !this.invRepo )
            this.invRepo = new MysqlInvRepository()
        return this.invRepo
    }
}
