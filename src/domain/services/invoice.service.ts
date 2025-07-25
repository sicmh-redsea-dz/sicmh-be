import { ResultSetHeader } from 'mysql2'
import { generateShortenedUuid } from '../../helper/uuidGen'
import { Database } from '../../infrastructure/database/Database'
import { InvoiceMapper } from '../mappers/InvoiceMapper'
import { PatientsService } from './patients.service'
import { invoiceQueries } from '../../infrastructure/database/queries/invoice.queries'

interface Delimiters {
  limit: number,
  offset: number,
  term: string,
}

export class InvoiceService {

    private patientService: PatientsService

    constructor( patientService: PatientsService ) {
        this.patientService = patientService
    }

    getInvoices = async( args: Delimiters ): Promise<any> => {
        const invoiceQ = invoiceQueries('read', args)
        try {
            const invoiceResp = await Database.execute<any[]>( invoiceQ )
            const totalRegistries = invoiceResp.length > 0 ? invoiceResp[0].total_registries : 0
            return {
                invoiceResp,
                totalRegistries
            }
        } catch( err: any ) {
            console.log('error reading invoices ::: ', err.message)
            throw err
        }
    }

    createInvoice = async( createInvoicePayload:any ): Promise<any> => {
        const invoiceNum = generateShortenedUuid()

        if ( createInvoicePayload.origin )
            delete createInvoicePayload.service

        const mappedFields = InvoiceMapper.toDbForm({ 
            ...createInvoicePayload, 
            invoiceNum, 
            IsActive: true, 
            state: createInvoicePayload.origin ? 'Pagado' : 'Pendiente', 
        })
        
        const translatedFields = this.removeUndefined( mappedFields )
        const { query, values } = this.buildInsertQuery('facturas', translatedFields)
        
        try {
            const resp = await Database.execute<ResultSetHeader>(query, values)
            const { insertId } = resp

            return insertId
        } catch ( err: any ) {
            console.log('error creating invoice ::: ', err.message)
            throw err
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

    updateInvById = async (id: string, updInvoicePayload: Record<string, any>): Promise<any> => {
        const mappedFields = InvoiceMapper.toDbForm({
            ...updInvoicePayload,
            invoiceNum: id,
            state: 'Pagado'
        })

        const translatedFields = this.removeUndefined(mappedFields)

        delete translatedFields.invoiceNum
        delete translatedFields['InvoiceNumber']

        const entries = Object.entries(translatedFields).map(([key, value]) => {
            return [key, value === undefined ? null : value]
        })

        const setClauses = entries.map(([key]) => `\`${key}\` = ?`).join(', ')
        const values = entries.map(([, value]) => value ?? null)

        const sql = `
            UPDATE \`cami-vime\`.\`facturas\`
            SET ${setClauses}
            WHERE \`InvoiceNumber\` = ?
        `

        try {
            await Database.execute(sql, [...values, id])
            return {
                id
            }
        } catch (err) {
            console.error('Error en updateInvById:', err)
            throw new Error((err as any)?.message || 'Error desconocido')
        }
    }

    removeInvoiceById = async ( invoiceId: string ): Promise<any> => {
        const invQ = invoiceQueries( 'delete' )
        const values = [ 0, invoiceId ]

        try {
            await Database.execute( invQ, values )
            return true
        } catch ( err: any ) {
            console.error('Error deleting Invoice by Id ::::: ', err)
            throw err
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