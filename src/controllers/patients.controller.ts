import { Request, Response } from 'express';
import { PatientsService } from '../services/patients.srvc';
import { pool } from '../config/database';

const patientService = new PatientsService(pool);

export const getPatients = async (req: Request, res: Response) => {
  const patients = await patientService.findAll();
  res.status(200).json({
    data: {
      patients,
      totalCount: patients.length
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