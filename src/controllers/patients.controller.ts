import { Request, Response } from 'express';
import { PatientsService } from '../services/patients.srvc';
import { pool } from '../config/database';

const patientService = new PatientsService(pool);

export const getPatients = async (req: Request, res: Response) => {
  const limit = parseInt((req.query.limit || '25').toString())
  const offset = parseInt((req.query.offset || '0').toString())

  if (isNaN(limit) || limit <= 0 || isNaN(offset) || offset < 0) {
    res.status(400).json({ 
      error: 'Invalid pagination parameters. "limit" must be a positive integer and "offset" must be a non-negative integer.'
    });
    return
  }
  
  const pagination = { limit, offset }
  const [patients, totalRegistries] = await patientService.findAll(false, pagination);
  res.status(200).json({
    data: {
      patients,
      totalCount: Array.isArray(patients) ? patients.length : 0,
      totalRegistries
    }
  });
};

export const getPatient = async(req: Request, res: Response) => {
  const { id } = req.params
  const patient = await patientService.findOne( id )
  res.status(200).json({
    data: { patient }
  });
}

export const postPatients = async (req: Request, res: Response) => {
  const newPatient = req.body
  const patient = await patientService.saveNewPatient(newPatient);
  res.status(201).json({
    data: { patient }
  });
};

export const patchPacient = async (req: Request, res: Response ) => {
  const { id } = req.params
  const patientData = req.body
  const patient = await patientService.updatePatient( id, patientData)
  res.status(200).json({
    data: { patient }
  });
}

export const softDeletePacient = async (req: Request, res: Response ) => {
const { id } = req.params
await patientService.softDeletePatient(parseInt( id ))
  res.status(200).json({
    data: {
      msg: 'ok'
    }
  })
}