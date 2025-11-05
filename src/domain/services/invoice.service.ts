import { ResultSetHeader } from 'mysql2'
import { generateShortenedUuid } from '../../helper/uuidGen'
import { Database } from '../../infrastructure/database/Database'
import { InvoiceMapper } from '../mappers/InvoiceMapper'
import { PatientsService } from './patients.service'
import { invoiceQueries } from '../../infrastructure/database/queries/invoice.queries'
import puppeteer from 'puppeteer'

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

    generateCloseReportPdf = async ( term?: string ): Promise<any> => {
        let browser;
        try {
            const [headerData, summaryData, paymentsData, cashbox] = await Promise.all([
                Database.execute<any[]>(invoiceQueries('report-header'), [ term ]),
                Database.execute<any[]>(invoiceQueries('report-summary'), [ term ]),
                Database.execute<any[]>(invoiceQueries('report-payments'), [ term ]),
                Database.execute<any[]>(invoiceQueries('report-cashbox'), [ term, term, term ]),
            ])
            const html = this.renderCloseReportTemplate({
                header: headerData[0],
                summary: summaryData,
                payments: paymentsData,
                cashbox: cashbox
            })
            
            browser = await puppeteer.launch({
                headless: true,
                executablePath: '/usr/bin/google-chrome',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            })
            const page = await browser.newPage()
            await page.setContent(html, { waitUntil: 'networkidle0' })
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true
            })

            return pdfBuffer
        } catch ( err: any ) {
            console.error('Error generando PDF: ', err?.message || err )
            throw err
        } finally {
            if ( browser )
                await browser.close().catch(() => {})
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

    private renderCloseReportTemplate = ( args: { 
        header: any,
        summary: any,
        payments: any,
        cashbox: any,
    }) => {
        const { header, summary, payments, cashbox } = args
        const summaryRows = summary.map((r: any) => `
            <tr>
                <td>${r.estado_factura}</td>
                <td>${r.cantidad_facturas}</td>
                <td>${Number(r.total_monto).toFixed(2)}</td>
            </tr>`
        ).join('')

        const paymentRows = payments.map((r: any) => `
            <tr>
                <td>${r.metodo_pago}</td>
                <td>${r.cantidad}</td>
                <td>${Number(r.total_monto).toFixed(2)}</td>
            </tr>`
        ).join('');

        const cashboxRows = cashbox.map((r: any) => `
            <tr>
                <td>${r.descripcion}</td>
                <td>${Number(r.total_sistema).toFixed(2)}</td>
                <td>${r.conteo_manual ?? ''}</td>
                <td>${r.diferencia ?? ''}</td>
            </tr>`
        ).join('');

        return `
        <!DOCTYPE html>
        <html>
            <head>
            <meta charset="UTF-8">
            <style>
                * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Roboto', sans-serif;
                }
                body {
                margin: 2cm;
                font-size: 12px;
                }
                h1 {
                text-align: left;
                font-size: 2rem;
                font-weight: 500;
                margin-bottom: 1rem;
                color: #17365D;
                }
                .divider {
                border-top: 2px solid #B1C7E2;
                margin: 1rem 0 2rem 0;
                }
                .section { margin-bottom: 1.5rem; }
                .section.no-border .info-pair {
                display: flex;
                margin-bottom: 4px;
                font-size: 16px;
                }
                .section.no-border .label { margin-right: 16px; }
                .section.no-border .value {
                font-weight: bold;
                text-align: right;
                margin-left: auto;
                }
                .section-title {
                font-weight: bold;
                margin-bottom: 0.5rem;
                text-decoration: underline;
                font-size: 16px;
                }
                table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 0.5rem;
                }
                th, td {
                border: 1px solid #999;
                padding: 6px;
                text-align: left;
                font-size: 14px;
                }
                .no-border td {
                border: none;
                padding: 4px;
                }
                .signature-line {
                margin-top: 4rem;
                display: flex;
                justify-content: space-between;
                }
                .signature-line div {
                width: 45%;
                border-top: 1px solid #000;
                text-align: center;
                font-size: 11px;
                padding-top: 0.2rem;
                }
            </style>
            </head>
            <body>
            <h1>MedIT - Reporte de Cierre de Caja</h1>
            <div class="divider"></div>

            <div class="section no-border">
                <div class="info-pair"><span class="label" style="margin-right: 34px;">Fecha:</span><span class="value">${header?.fecha_actual}</span></div>
                <div class="info-pair"><span class="label" style="margin-right: 34px;">Rango:</span><span class="value">${header?.rango_fechas}</span></div>
                <div class="info-pair"><span class="label">Cajero/a:</span><span class="value">${header?.cajero}</span></div>
                <div class="info-pair"><span class="label" style="margin-right: 34px;">Turno:</span><span class="value">${header?.turno}</span></div>
            </div>

            <div class="section">
                <div class="section-title">Resumen de Ventas</div>
                <table>
                <thead>
                    <tr><th>Categoría</th><th>Cantidad</th><th>Total (L.)</th></tr>
                </thead>
                <tbody>
                    ${summaryRows}
                </tbody>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Detalle de Métodos de Pago</div>
                <table>
                <thead>
                    <tr><th>Método de Pago</th><th>Monto (L.)</th><th>Notas</th></tr>
                </thead>
                <tbody>
                    ${paymentRows}
                </tbody>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Caja y Reconciliación</div>
                <table>
                <thead>
                    <tr>
                    <th>Descripción</th><th>Total del Sistema</th><th>Conteo Manual</th><th>Diferencia</th>
                    </tr>
                </thead>
                <tbody>
                    ${cashboxRows}
                </tbody>
                </table>
            </div>

            <div class="section">
                <div class="section-title">Observaciones</div>
                <p>[Diferencias, explicaciones o incidencias observadas]</p>
            </div>

            <div class="signature-line">
                <div>Firma Cajero/a</div>
                <div>Firma Supervisor/a</div>
            </div>
            </body>
        </html>
        `
    }
}