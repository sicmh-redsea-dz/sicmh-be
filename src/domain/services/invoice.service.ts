import { ResultSetHeader } from 'mysql2'
import { generateShortenedUuid } from '../../helper/uuidGen'
import { Database } from '../../infrastructure/database/Database'
import { InvoiceMapper } from '../mappers/InvoiceMapper'
import { PatientsService } from './patients.service'
import { invoiceQueries } from '../../infrastructure/database/queries/invoice.queries'

export class InvoiceService {

    private patientService: PatientsService

    constructor( patientService: PatientsService ) {
        this.patientService = patientService
    }

    createInvoice = async( createInvoicePayload:any ): Promise<any> => {
        const invoiceNum = generateShortenedUuid()

        const mappedFields = InvoiceMapper.toDbForm({ 
            ...createInvoicePayload, 
            invoiceNum, 
            isActive: true, 
            state: 'Pendiente', 
        })
        const translatedFields = this.removeUndefined( mappedFields )
        const { query, values } = this.buildInsertQuery('facturas', translatedFields)
        
        try {

            const resp = await Database.execute<ResultSetHeader>(query, values)
            const { insertId } = resp

            return insertId
        } catch ( err: any ) {
            throw new Error ( err.message )
        }
    }

    getInvById = async ( invNumber: string ): Promise<any> => {
        const queryForInv = invoiceQueries( 'get-one' )
        
        try {
            const invoice = await Database.execute<any>(queryForInv, [invNumber])
            
            return InvoiceMapper.toResp( invoice[0] )
        } catch ( err: any ) {
            throw new Error ( err.message )
        }
    }

    getRawData = async (): Promise<any> => {
        const servicesQ = invoiceQueries('getServices')
        const pMethodsQ = invoiceQueries('getPaymentMethods')
        const allDocsQ = invoiceQueries('all-docs')
        try {

            const resp = await Promise.all([
                this.patientService.findAllPatients({limit: 25, offset: 0}),
                Database.execute( servicesQ ),
                Database.execute( pMethodsQ ),
                Database.execute( allDocsQ )
            ])

            const [patientsResp, servicesResp, paymentMethodsResp, doctorsResp] = resp 

            const services = (servicesResp as object[]).map((s: any) => ({
                id: s.ServicioID,
                serviceName: s.NombreServicio,
                serviceDescription: s.Descripcion,
                servicePrice: parseFloat(s.Precio)
            }))

            const paymentMethods = (paymentMethodsResp as object[]).map((p: any) => ({
                id: p.TipoPagoID,
                paymentDescription: p.Descripcion
            }))

            const doctors = (doctorsResp as object[]).map((d: any) => ({
                id: d.PersonalID,
                name: d.NombreDoctor
            }))

            return {
                patients: patientsResp.patients,
                services,
                paymentMethods,
                doctors
            }
        } catch ( err: any ) {
            throw new Error( err.message )
        }
    }

    private buildInsertQuery(table: string, data: Record<string, any>): { query: string; values: any[] } {
        const keys = Object.keys(data)
        const columns = keys.join(', ')
        const placeholders = keys.map(() => '?').join(', ')
        const values = keys.map((key) => data[key])

        const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders});`
        return { query, values }
    }

    private removeUndefined(obj: Record<string, any>): Record<string, any> {
        return Object.fromEntries(
            Object.entries(obj).filter(([_, value]) => value !== undefined)
        );
    }


}