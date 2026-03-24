import { AuthService } from '../../application/services/auth.service'
import { PatientsService } from '../../application/services/patients.service'
import { VisitsService } from '../../application/services/visits.service'
import { StockService } from '../../application/services/stock.services'
import { StaffService } from '../../application/services/staff.service'
import { DashbService } from '../../application/services/dashboard.service'
import { InvoiceService } from '../../application/services/invoice.service'
import { BillingService } from '../../application/services/billing.service'
import { InvService } from '../../application/services/inv.service'
import { BedsService } from '../../application/services/beds.service'
import { OrRoomsService } from '../../application/services/or-rooms.service'
import { PatientImagesService } from '../../application/services/patient-images.service'
import { PatientImageCaptureService } from '../../application/services/patient-image-capture.service'
import { SettingsService } from '../../application/services/settings.service'
import { AccessControlService } from '../../application/services/access-control.service'
import { MysqlAuthRepository } from '../repositories/mysql-auth.repository'
import { MysqlPatientsRepository } from '../repositories/mysql-patients.repository'
import { MysqlVisitsRepository } from '../repositories/mysql-visits.repository'
import { MysqlStockRepository } from '../repositories/mysql-stock.repository'
import { MysqlStaffRepository } from '../repositories/mysql-staff.repository'
import { MysqlDashboardRepository } from '../repositories/mysql-dashboard.repository'
import { MysqlInvoiceRepository } from '../repositories/mysql-invoice.repository'
import { MysqlBillingRepository } from '../repositories/mysql-billing.repository'
import { MysqlInvRepository } from '../repositories/mysql-inv.repository'
import { FileExpedienteRepository } from '../repositories/file-expediente.repository'
import { FileBedsRepository } from '../repositories/file-beds.repository'
import { FileOrRoomsRepository } from '../repositories/file-or-rooms.repository'
import { FileBillingLedgerRepository } from '../repositories/file-billing-ledger.repository'
import { FilePatientMovementsRepository } from '../repositories/file-patient-movements.repository'
import { FilePatientEncountersRepository } from '../repositories/file-patient-encounters.repository'
import { FilePatientImagesRepository } from '../repositories/file-patient-images.repository'
import { FilePatientImageCaptureRepository } from '../repositories/file-patient-image-capture.repository'
import { FileUserProfilesRepository } from '../repositories/file-user-profiles.repository'
import { FileRolePermissionsRepository } from '../repositories/file-role-permissions.repository'
import { FileUserPermissionsRepository } from '../repositories/file-user-permissions.repository'

export class ServiceContainer {
    private static authService: AuthService
    private static patientsService: PatientsService
    private static visitsService: VisitsService
    private static staffService: StaffService
    private static stockService: StockService
    private static dashbService: DashbService
    private static invoiceService: InvoiceService
    private static billingService: BillingService
    private static invService: InvService
    private static bedsService: BedsService
    private static orRoomsService: OrRoomsService
    private static patientImagesService: PatientImagesService
    private static patientImageCaptureService: PatientImageCaptureService
    private static settingsService: SettingsService
    private static accessControlService: AccessControlService
    private static authRepo: MysqlAuthRepository
    private static patientsRepo: MysqlPatientsRepository
    private static visitsRepo: MysqlVisitsRepository
    private static stockRepo: MysqlStockRepository
    private static staffRepo: MysqlStaffRepository
    private static dashbRepo: MysqlDashboardRepository
    private static invoiceRepo: MysqlInvoiceRepository
    private static billingRepo: MysqlBillingRepository
    private static invRepo: MysqlInvRepository
    private static expedienteRepo: FileExpedienteRepository
    private static bedsRepo: FileBedsRepository
    private static orRoomsRepo: FileOrRoomsRepository
    private static billingLedgerRepo: FileBillingLedgerRepository
    private static patientMovementsRepo: FilePatientMovementsRepository
    private static patientEncountersRepo: FilePatientEncountersRepository
    private static patientImagesRepo: FilePatientImagesRepository
    private static patientImageCaptureRepo: FilePatientImageCaptureRepository
    private static userProfilesRepo: FileUserProfilesRepository
    private static rolePermissionsRepo: FileRolePermissionsRepository
    private static userPermissionsRepo: FileUserPermissionsRepository

    static getAuthService(): AuthService {
        if (!this.authService)
            this.authService = new AuthService(
                this.getAuthRepository(),
                this.getUserProfilesRepository(),
                this.getAccessControlService()
            )
        return this.authService
    }

    static getSettingsService(): SettingsService {
        if (!this.settingsService) {
            this.settingsService = new SettingsService(
                this.getAuthRepository(),
                this.getUserProfilesRepository(),
                this.getAccessControlService()
            )
        }
        return this.settingsService
    }

    static getAccessControlService(): AccessControlService {
        if (!this.accessControlService) {
            this.accessControlService = new AccessControlService(
                this.getRolePermissionsRepository(),
                this.getUserPermissionsRepository()
            )
        }
        return this.accessControlService
    }

    static getVisitsService(): VisitsService {
        if (!this.visitsService) 
            this.visitsService = new VisitsService( 
                this.getStaffService(), 
                this.getPatientsService(),
                this.getStockService(),
                this.getInvoiceService(),
                this.getBillingService(),
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
            this.invoiceService = new InvoiceService(
                this.getPatientsService(),
                this.getInvoiceRepository(),
                this.getBillingService()
            )
        }
        return this.invoiceService
    }

    static getBillingService(): BillingService {
        if (!this.billingService) {
            this.billingService = new BillingService(
                this.getPatientsService(),
                this.getStockService(),
                this.getBillingRepository(),
                this.getBillingLedgerRepository(),
                this.getPatientMovementsRepository(),
                this.getPatientEncountersRepository(),
                this.getInvoiceRepository()
            )
        }
        return this.billingService
    }

    static getInvService(): InvService {
        if ( !this.invService ) {
            this.invService = new InvService( this.getInvRepository() )
        }
        return this.invService
    }

    static getBedsService(): BedsService {
        if ( !this.bedsService ) {
            this.bedsService = new BedsService( this.getBedsRepository(), this.getBillingService() )
        }
        return this.bedsService
    }

    static getOrRoomsService(): OrRoomsService {
        if ( !this.orRoomsService ) {
            this.orRoomsService = new OrRoomsService( this.getOrRoomsRepository(), this.getBillingService() )
        }
        return this.orRoomsService
    }

    static getPatientImagesService(): PatientImagesService {
        if ( !this.patientImagesService ) {
            this.patientImagesService = new PatientImagesService( this.getPatientImagesRepository() )
        }
        return this.patientImagesService
    }

    static getPatientImageCaptureService(): PatientImageCaptureService {
        if (!this.patientImageCaptureService) {
            this.patientImageCaptureService = new PatientImageCaptureService(this.getPatientImageCaptureRepository())
        }
        return this.patientImageCaptureService
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

    private static getBillingRepository(): MysqlBillingRepository {
        if (!this.billingRepo)
            this.billingRepo = new MysqlBillingRepository()
        return this.billingRepo
    }

    private static getExpedienteRepository(): FileExpedienteRepository {
        if ( !this.expedienteRepo )
            this.expedienteRepo = new FileExpedienteRepository()
        return this.expedienteRepo
    }

    private static getBedsRepository(): FileBedsRepository {
        if ( !this.bedsRepo )
            this.bedsRepo = new FileBedsRepository()
        return this.bedsRepo
    }

    private static getOrRoomsRepository(): FileOrRoomsRepository {
        if ( !this.orRoomsRepo )
            this.orRoomsRepo = new FileOrRoomsRepository()
        return this.orRoomsRepo
    }

    private static getBillingLedgerRepository(): FileBillingLedgerRepository {
        if (!this.billingLedgerRepo)
            this.billingLedgerRepo = new FileBillingLedgerRepository()
        return this.billingLedgerRepo
    }

    private static getPatientMovementsRepository(): FilePatientMovementsRepository {
        if (!this.patientMovementsRepo)
            this.patientMovementsRepo = new FilePatientMovementsRepository()
        return this.patientMovementsRepo
    }

    private static getPatientEncountersRepository(): FilePatientEncountersRepository {
        if (!this.patientEncountersRepo) {
            this.patientEncountersRepo = new FilePatientEncountersRepository()
        }
        return this.patientEncountersRepo
    }

    private static getPatientImagesRepository(): FilePatientImagesRepository {
        if ( !this.patientImagesRepo )
            this.patientImagesRepo = new FilePatientImagesRepository()
        return this.patientImagesRepo
    }

    private static getPatientImageCaptureRepository(): FilePatientImageCaptureRepository {
        if (!this.patientImageCaptureRepo) {
            this.patientImageCaptureRepo = new FilePatientImageCaptureRepository()
        }
        return this.patientImageCaptureRepo
    }

    private static getUserProfilesRepository(): FileUserProfilesRepository {
        if (!this.userProfilesRepo) {
            this.userProfilesRepo = new FileUserProfilesRepository()
        }
        return this.userProfilesRepo
    }

    private static getRolePermissionsRepository(): FileRolePermissionsRepository {
        if (!this.rolePermissionsRepo) {
            this.rolePermissionsRepo = new FileRolePermissionsRepository()
        }
        return this.rolePermissionsRepo
    }

    private static getUserPermissionsRepository(): FileUserPermissionsRepository {
        if (!this.userPermissionsRepo) {
            this.userPermissionsRepo = new FileUserPermissionsRepository()
        }
        return this.userPermissionsRepo
    }

    private static getInvRepository(): MysqlInvRepository {
        if ( !this.invRepo )
            this.invRepo = new MysqlInvRepository()
        return this.invRepo
    }
}
