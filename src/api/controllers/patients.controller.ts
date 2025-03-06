import { NextFunction, Request, Response } from 'express'
import { PatientsService } from '../../domain/services/patients.service'

export class PatientsController {
    static getPatients = async (req:Request, res:Response, next:NextFunction) => {
        const limit = Number(req.query.limit) || 25
        const offset = Number(req.query.offset) || 0

        try {
            const { patients, totalRegistries } = await PatientsService.findAllPatients({limit, offset})
            res.status( 202 ).json({
                data: {
                    patients,
                    totalCount: patients.length,
                    totalRegistries
                }
            })
        } catch ( err ) {
            next( err )
        }
    }

    static getPatient = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = req.params 
        try {
            const patient = await PatientsService.findOnePatient(Number(id))
            res.status( 200 ).json({
                data: { patient }
            })
        } catch ( err ) {
            next( err )
        }
    }

    static insertPatient = async (req:Request, res:Response, next:NextFunction) => {
        const body = req.body
        try {
            const insertedPatient = await PatientsService.insertPatient(body)
            res.status( 201 ).json({
                data: { patient: insertedPatient }
            })
        } catch ( err ) {
            next( err )
        }
    }

    static updatePatient = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = req.params
        const body = req.body
        try {
            const updatedPatient = await PatientsService.updatedPatient(body, Number(id))
            res.status( 200 ).json({
                data: {
                    patient: updatedPatient
                }
            })
        } catch ( err ) {
            next( err )
        }
    }

    static deletePatient = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = req.params
        try {
            const [isPatientDeleted, patientId] = await PatientsService.softDeletePatient( Number(id) )
            res.status(200).json({
                data: {
                  msg: 'ok',
                  status: isPatientDeleted && 'deleted',
                  patientId
                }
            })
        } catch ( err ) {
            next ( err )
        }
    }
}