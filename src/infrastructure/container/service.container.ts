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
import { SettingsService } from '../../application/services/settings.service'
import { AccessControlService } from '../../application/services/access-control.service'
import { CitasService } from '../../application/services/citas.service'
import { MysqlCitasRepository } from '../repositories/mysql-citas.repository'
import { MysqlAuthRepository } from '../repositories/mysql-auth.repository'
import { MysqlPatientsRepository } from '../repositories/mysql-patients.repository'
import { MysqlVisitsRepository } from '../repositories/mysql-visits.repository'
import { MysqlStockRepository } from '../repositories/mysql-stock.repository'
import { MysqlStaffRepository } from '../repositories/mysql-staff.repository'
import { MysqlDashboardRepository } from '../repositories/mysql-dashboard.repository'
import { MysqlInvoiceRepository } from '../repositories/mysql-invoice.repository'
import { MysqlBillingRepository } from '../repositories/mysql-billing.repository'
import { MysqlInvRepository } from '../repositories/mysql-inv.repository'
import { DrizzleExpedienteRepository } from '../repositories/drizzle-expediente.repository'
import { DrizzleBedsRepository } from '../repositories/drizzle-beds.repository'
import { DrizzleOrRoomsRepository } from '../repositories/drizzle-or-rooms.repository'
import { DrizzleBillingLedgerRepository } from '../repositories/drizzle-billing-ledger.repository'
import { DrizzlePatientMovementsRepository } from '../repositories/drizzle-patient-movements.repository'
import { DrizzlePatientEncountersRepository } from '../repositories/drizzle-patient-encounters.repository'
import { DrizzleUserProfilesRepository } from '../repositories/drizzle-user-profiles.repository'
import { DrizzleRolePermissionsRepository } from '../repositories/drizzle-role-permissions.repository'
import { DrizzleUserPermissionsRepository } from '../repositories/drizzle-user-permissions.repository'
import { ClinicalAttachmentsService } from '../../application/services/clinical-attachments.service'
import { MysqlClinicalAttachmentsRepository } from '../repositories/mysql-clinical-attachments.repository'
import { GcsFileStorage } from '../storage/gcs-file-storage'
import { config } from '../../config/env'

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
    private static settingsService: SettingsService
    private static accessControlService: AccessControlService
    private static citasService: CitasService
    private static citasRepo: MysqlCitasRepository
    private static authRepo: MysqlAuthRepository
    private static patientsRepo: MysqlPatientsRepository
    private static visitsRepo: MysqlVisitsRepository
    private static stockRepo: MysqlStockRepository
    private static staffRepo: MysqlStaffRepository
    private static dashbRepo: MysqlDashboardRepository
    private static invoiceRepo: MysqlInvoiceRepository
    private static billingRepo: MysqlBillingRepository
    private static invRepo: MysqlInvRepository
    private static expedienteRepo: DrizzleExpedienteRepository
    private static bedsRepo: DrizzleBedsRepository
    private static orRoomsRepo: DrizzleOrRoomsRepository
    private static billingLedgerRepo: DrizzleBillingLedgerRepository
    private static patientMovementsRepo: DrizzlePatientMovementsRepository
    private static patientEncountersRepo: DrizzlePatientEncountersRepository
    private static userProfilesRepo: DrizzleUserProfilesRepository
    private static rolePermissionsRepo: DrizzleRolePermissionsRepository
    private static userPermissionsRepo: DrizzleUserPermissionsRepository
    private static clinicalAttachmentsService: ClinicalAttachmentsService
    private static clinicalAttachmentsRepo: MysqlClinicalAttachmentsRepository

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

    static getCitasService(): CitasService {
        if (!this.citasService)
            this.citasService = new CitasService(this.getCitasRepository())
        return this.citasService
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

    static getClinicalAttachmentsService(): ClinicalAttachmentsService {
        if (!this.clinicalAttachmentsService) {
            this.clinicalAttachmentsService = new ClinicalAttachmentsService(
                this.getClinicalAttachmentsRepository(),
                new GcsFileStorage(config.GCS_CLINICAL_BUCKET),
                new GcsFileStorage(config.GCS_PUBLIC_BUCKET)
            )
        }
        return this.clinicalAttachmentsService
    }

    private static getClinicalAttachmentsRepository(): MysqlClinicalAttachmentsRepository {
        if (!this.clinicalAttachmentsRepo) {
            this.clinicalAttachmentsRepo = new MysqlClinicalAttachmentsRepository()
        }
        return this.clinicalAttachmentsRepo
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

    private static getExpedienteRepository(): DrizzleExpedienteRepository {
        if ( !this.expedienteRepo )
            this.expedienteRepo = new DrizzleExpedienteRepository()
        return this.expedienteRepo
    }

    private static getBedsRepository(): DrizzleBedsRepository {
        if ( !this.bedsRepo )
            this.bedsRepo = new DrizzleBedsRepository()
        return this.bedsRepo
    }

    private static getOrRoomsRepository(): DrizzleOrRoomsRepository {
        if ( !this.orRoomsRepo )
            this.orRoomsRepo = new DrizzleOrRoomsRepository()
        return this.orRoomsRepo
    }

    private static getBillingLedgerRepository(): DrizzleBillingLedgerRepository {
        if (!this.billingLedgerRepo)
            this.billingLedgerRepo = new DrizzleBillingLedgerRepository()
        return this.billingLedgerRepo
    }

    private static getPatientMovementsRepository(): DrizzlePatientMovementsRepository {
        if (!this.patientMovementsRepo)
            this.patientMovementsRepo = new DrizzlePatientMovementsRepository()
        return this.patientMovementsRepo
    }

    private static getPatientEncountersRepository(): DrizzlePatientEncountersRepository {
        if (!this.patientEncountersRepo) {
            this.patientEncountersRepo = new DrizzlePatientEncountersRepository()
        }
        return this.patientEncountersRepo
    }

    private static getUserProfilesRepository(): DrizzleUserProfilesRepository {
        if (!this.userProfilesRepo) {
            this.userProfilesRepo = new DrizzleUserProfilesRepository()
        }
        return this.userProfilesRepo
    }

    private static getRolePermissionsRepository(): DrizzleRolePermissionsRepository {
        if (!this.rolePermissionsRepo) {
            this.rolePermissionsRepo = new DrizzleRolePermissionsRepository()
        }
        return this.rolePermissionsRepo
    }

    private static getUserPermissionsRepository(): DrizzleUserPermissionsRepository {
        if (!this.userPermissionsRepo) {
            this.userPermissionsRepo = new DrizzleUserPermissionsRepository()
        }
        return this.userPermissionsRepo
    }

    private static getCitasRepository(): MysqlCitasRepository {
        if (!this.citasRepo)
            this.citasRepo = new MysqlCitasRepository()
        return this.citasRepo
    }

    private static getInvRepository(): MysqlInvRepository {
        if ( !this.invRepo )
            this.invRepo = new MysqlInvRepository()
        return this.invRepo
    }
}
