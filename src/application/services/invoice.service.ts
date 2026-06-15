import { generateShortenedUuid } from '../../helper/uuidGen'
import { InvoiceRepository } from '../ports/invoice.repository'
import { InvoiceMapper } from '../../domain/mappers/InvoiceMapper'
import { PatientsService } from './patients.service'
import { BillingService } from './billing.service'
import { renderPdfFromHtml } from '../../utils/pdfRenderer'

interface Delimiters {
  limit: number,
  offset: number,
  term: string,
}

export class InvoiceService {

    private patientService: PatientsService
    private billingService?: BillingService

    constructor( patientService: PatientsService, private readonly invoiceRepo: InvoiceRepository, billingService?: BillingService ) {
        this.patientService = patientService
        this.billingService = billingService
    }

    getInvoices = async( args: Delimiters ): Promise<any> => {
        try {
            const invoiceResp = await this.invoiceRepo.findAll( args )
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
        
        try {
            const id = await this.invoiceRepo.create( translatedFields )
            return { id, invoiceNumber: invoiceNum }
        } catch ( err: any ) {
            console.log('error creating invoice ::: ', err.message)
            throw err
        }
    }

    getInvById = async ( invNumber: string ): Promise<any> => {
        try {
            const invoice = await this.invoiceRepo.findByInvoiceNumber( invNumber )
            if ( !invoice ) {
                const error = new Error(`Invoice with Id ${invNumber} not found`)
                error.name = 'not_found_error'
                throw error
            }
            
            return InvoiceMapper.toResp( invoice )
        } catch ( err: any ) {
            throw new Error ( err.message )
        }
    }

    updateInvById = async (id: string, updInvoicePayload: Record<string, any>): Promise<any> => {
        const currentInvoice = await this.invoiceRepo.findByInvoiceNumber(id)
        if (!currentInvoice) {
            const error = new Error(`Invoice with Id ${id} not found`)
            error.name = 'not_found_error'
            throw error
        }
        const normalizedStatus = String(currentInvoice.Estado || '').toLowerCase()
        if (normalizedStatus.includes('pag')) {
            const error = new Error('Invoice already paid')
            error.name = 'validation_errors'
            ;(error as any).errors = [{ msg: 'No se puede editar una factura pagada.' }]
            throw error
        }
        if (normalizedStatus.includes('anul')) {
            const error = new Error('Invoice already annulled')
            error.name = 'validation_errors'
            ;(error as any).errors = [{ msg: 'No se puede editar una factura anulada.' }]
            throw error
        }

        const mappedFields = InvoiceMapper.toDbForm({
            ...updInvoicePayload,
            invoiceNum: id,
            state: 'Pagado'
        })

        const translatedFields = this.removeUndefined(mappedFields)

        delete translatedFields.invoiceNum
        delete translatedFields['InvoiceNumber']

        try {
            await this.invoiceRepo.updateByInvoiceNumber( id, translatedFields )
            if (this.billingService) {
                try {
                    await this.billingService.updateEncounterStatusByInvoice(id, 'Pagado')
                } catch (err) {
                    console.warn('encounter status update warning:', (err as any)?.message || err)
                }
            }
            return {
                id
            }
        } catch (err) {
            console.error('Error en updateInvById:', err)
            throw new Error((err as any)?.message || 'Error desconocido')
        }
    }

    incrementAmountById = async ( invoiceId: number, delta: number ): Promise<void> => {
        if (!delta) return
        try {
            await this.invoiceRepo.incrementAmountById( invoiceId, delta )
        } catch ( err: any ) {
            console.error('Error updating invoice amount ::::: ', err)
            throw err
        }
    }

    annulInvoiceById = async ( invoiceId: string ): Promise<any> => {
        const invoice = await this.invoiceRepo.findByInvoiceNumber(invoiceId)
        if (!invoice) {
            const error = new Error(`Invoice with Id ${invoiceId} not found`)
            error.name = 'not_found_error'
            throw error
        }

        if (String(invoice.Estado || '').toLowerCase().includes('anul')) {
            return { invoiceId, newInvoiceId: null }
        }

        await this.invoiceRepo.updateByInvoiceNumber(invoiceId, { Estado: 'Anulado' })

        const payload = {
            patient: invoice.PacienteID,
            doctor: invoice.PersonalID,
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            ensurance: invoice.AseguradoraID,
            elderlyDiscount: invoice.DescuentoElderly,
            promCode: invoice.CodigoPromocional,
            discount: invoice.DescuentoPromocional,
            rtn: invoice.RTN,
            cai: invoice.CAI,
            pMethod: invoice.TipoPagoID
        }

        const created = await this.createInvoice(payload)

        if (this.billingService) {
            try {
                const patient = await this.patientService.findOnePatient(invoice.PacienteID)
                await this.billingService.transferInvoiceContext({
                    fromInvoiceNumber: invoiceId,
                    fromInvoiceId: invoice.FacturaID,
                    toInvoiceNumber: created.invoiceNumber,
                    toInvoiceId: created.id,
                    patientId: invoice.PacienteID,
                    patientName: `${patient.name} ${patient.lastName}`.trim(),
                    doctorId: invoice.PersonalID
                })
            } catch (err) {
                console.warn('invoice transfer warning:', (err as any)?.message || err)
            }
        }

        return { invoiceId, newInvoiceId: created.invoiceNumber }
    }

    removeInvoiceById = async ( invoiceId: string ): Promise<any> => {
        try {
            await this.invoiceRepo.softDeleteByInvoiceNumber( invoiceId )
            return true
        } catch ( err: any ) {
            console.error('Error deleting Invoice by Id ::::: ', err)
            throw err
        }
    }


    getRawData = async (): Promise<any> => {
        try {

            const resp = await Promise.all([
                this.patientService.findAllPatients({limit: 25, offset: 0}),
                this.invoiceRepo.fetchServices(),
                this.invoiceRepo.fetchPaymentMethods(),
                this.invoiceRepo.fetchDoctors()
            ])

            const [patientsResp, servicesResp, paymentMethodsResp, doctorsResp] = resp 

            const services = (servicesResp as object[]).map((s: any) => ({
                id: s.ServicioID,
                serviceName: s.NombreServicio ?? s.Nombre,
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
        try {
            const [headerData, summaryData, paymentsData, cashbox] = await Promise.all([
                this.invoiceRepo.fetchReportHeader( term ),
                this.invoiceRepo.fetchReportSummary( term ),
                this.invoiceRepo.fetchReportPayments( term ),
                this.invoiceRepo.fetchReportCashbox( term ),
            ])
            const html = this.renderCloseReportTemplate({
                header: headerData[0],
                summary: summaryData,
                payments: paymentsData,
                cashbox: cashbox
            })

            return renderPdfFromHtml(html)
        } catch ( err: any ) {
            console.error('Error generando PDF: ', err?.message || err )
            throw err
        }
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
