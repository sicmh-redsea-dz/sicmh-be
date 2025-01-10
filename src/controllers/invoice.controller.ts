import { Request, Response } from 'express'
import { InvoiceService } from '../services/invoice.srvc'
import { pool } from '../config/database'
import { VisitsService } from '../services/visits.srvc'
import { PatientsService } from '../services/patients.srvc'

const invoiceService = new InvoiceService(pool)
const visitsService = new VisitsService(pool)
const patientsService = new PatientsService(pool)

export const getInvoices = async (req: Request, res: Response) => {
  const invoices = await invoiceService.findAll()
  res.status( 200 ).json({
    data: { invoices }
  })
}

export const getDataForInvoice = async (req: Request, res: Response) => {
  const response = await Promise.all([
    invoiceService.newInvoiceData(),
    visitsService.findAllDocs(),
    patientsService.findAll(true)
  ])
  res.status(200).json({
    data: {
      services: response[0][0],
      paymentMethods: response[0][1],
      doctors: response[1],
      patients: response[2]
    }
  })
}

export const newInvoice = async(req: Request, res: Response) => {
  const invoiceFormData = req.body
  const response = await invoiceService.createInvoice(invoiceFormData)
  res.status(201).json({
    data: {
      invoice: response
    }
  })
}