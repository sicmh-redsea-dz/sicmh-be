import { v4 as uuidv4 } from 'uuid';
import { Pool, ResultSetHeader } from "mysql2/promise";
import { queries } from "../helper/invoices/queries";
import { InvoiceForm } from "../models/invoice.model";

export class InvoiceService {

  constructor(private pool: Pool) { }

  public async findAll() {
    let query = queries('get')
    try {
      const [response] = await this.pool.execute<[any[], any]>(query)
      return response
    } catch( err: any ) {
      throw new Error( err.message )
    }
  }

  public async newInvoiceData() {
    let queryForServices = queries('getServices')
    let queryForPaymentMethods = queries('getPaymentMethods')
    try {
      const response = await Promise.all([
        this.pool.execute<[any[], any]>( queryForServices ),
        this.pool.execute<[any[], any]>( queryForPaymentMethods )
      ]) 
      const [formattedServices, formattedPaymentMeths] = this.formatResponse( response )
      return [formattedServices, formattedPaymentMeths]
    }catch( err: any ) {
      throw new Error( err.message )
    }
  }

  public async createInvoice(invoiceForm: InvoiceForm) {
    const {date, doctor, pMethod, patient, amount, service} = invoiceForm
    const invoiceNumber = this.generateShortenedUuid()
    const values = [parseInt(patient), parseInt(doctor), date, parseFloat(amount), 'pendiente', invoiceNumber, pMethod]
    let queryForInvoice = queries('create-invoice')
    let queryForDetail = queries('create-detail-invoice')
    try {
        const [ response ]: [ResultSetHeader, any] = await this.pool.execute(queryForInvoice, values)
        const { insertId } = response
        await Promise.all(service.map((item) => this.pool.execute(queryForDetail, [insertId, item])))
        return insertId
    }catch( err: any ) {
      throw new Error(err.message)
    }
  }

  private generateShortenedUuid(): string {
    const uuid = uuidv4();
    const lastDashIndex = uuid.lastIndexOf('-')
    const secondLastDashIndex = uuid.lastIndexOf('-', lastDashIndex - 1)
    return uuid.substring(0, secondLastDashIndex)
  }

  private formatResponse(data: any[]): any[] {
    const [services, paymentMeths]  = data
    const formattedServices = services[0].map(( item: any ) => { 
      return {
        id: item.ServicioID,
        serviceName: item.NombreServicio,
        serviceDescription: item.Descripcion,
        servicePrice: item.Precio
      }
    })
    const formattedPaymentMeths = paymentMeths[0].map(( item: any ) => { 
      return {
        id: item.TipoPagoID,
        paymentDescription: item.Descripcion,
      }
    })
    return [formattedServices, formattedPaymentMeths]
  }
}