import { Response, Request } from 'express'
import { pool } from '../config/database'
import { VisitsService } from '../services/visits.srvc'
import { PatientsService } from '../services/patients.srvc'
import { StockService } from '../services/stock.srvc'

const visitsService = new VisitsService(pool)
const patientsService = new PatientsService( pool )
const stockService = new StockService( pool )

export const getVisits = async (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit || '25').toString())
  const offset = parseInt((req.query.offset || '0').toString())

  if (isNaN(limit) || limit <= 0 || isNaN(offset) || offset < 0) {
    res.status(400).json({ 
      error: 'Invalid pagination parameters. "limit" must be a positive integer and "offset" must be a non-negative integer.'
    });
    return
  }
  
  const pagination = { limit, offset }

  const [[ visits, totalRegistries ], doctors, patients, stock] = await Promise.all([
    visitsService.findAll(pagination),
    visitsService.findAllDocs(),
    patientsService.findAll(true),
    stockService.findall()
  ])
  
  res.status(200).json({
    data: {
      visits,
      patients,
      doctors,
      stock,
      totalVisitsCount: visits.length,
      totalPatientsCount: patients.length,
      totalDoctorsCount: doctors.length,
      totalRegistries: totalRegistries
    }
  })
}

export const getOneVisit = async(req: Request, res: Response) => {
  const { id } = req.params
  const visit = await visitsService.findOneVisit( id )
  res.status(200).json({
    data: {
      visit
    }
  })
}

export const createVisit = async (req: Request, res: Response) => {
  const visitFormData = req.body
  const { origin } = req.params
  const response = await visitsService.saveNewVisit( visitFormData, origin )
  res.status( 201 ).json({
    data: {
      visit: response
    }
  })
}

export const editVisit = async(req: Request, res: Response ) => {
  const { id } = req.params
  const args = req.body
  const updatedVisitId = await visitsService.editVisit(id, args)
  res.status(200).json({
    data: {
      id: updatedVisitId
    }
  })

}

export const softDeleteVisit = async(req: Request, res: Response ) => {
  const { id } = req.params
  await visitsService.softDeletePatient(parseInt(id))
  res.status(200).json({
    data: {
      msg: 'ok'
    }
  })

}