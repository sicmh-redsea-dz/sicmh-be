import { Response, Request } from 'express'
import { pool } from '../config/database'
import { VisitsService } from '../services/visits.srvc'

const visitsService = new VisitsService(pool)

export const getVisits = (req: Request, res: Response) => {
  res.send('ok')
}