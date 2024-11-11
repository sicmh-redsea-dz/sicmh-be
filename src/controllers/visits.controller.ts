import { Response, Request } from 'express'
import { pool } from '../config/database'
import { VisitsService } from '../services/visits.srvc'
import { PatientsService } from '../services/patients.srvc'
import { log } from 'console'

const visitsService = new VisitsService(pool)
const patientsService = new PatientsService( pool )

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

  const [ visits, doctors, patients] = await Promise.all([
    visitsService.findAll(pagination),
    visitsService.findAllDocs(),
    patientsService.findAll(true)
  ])

  res.status(200).json({
    data: {
      visits,
      patients,
      doctors,
      totalVisitsCount: visits.length,
      totalPatientsCount: patients.length,
      totalDoctorsCount: doctors.length
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
  const response = await visitsService.saveNewVisit( visitFormData )
  
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