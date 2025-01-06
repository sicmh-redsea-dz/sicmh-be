import { Request, Response } from 'express'
import { InvoiceService } from '../services/invoice.srvc'
import { pool } from '../config/database'

const invoiceService = new InvoiceService(pool)

export const getInvoices = async (req: Request, res: Response) => {
  const invoices = await invoiceService.findAll()
  res.status( 200 ).json({
    data: { invoices }
  })
}