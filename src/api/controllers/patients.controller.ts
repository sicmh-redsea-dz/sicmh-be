import { NextFunction, Request, Response } from 'express'
import { PatientsService } from '../../domain/services/patients.service'
import { ServiceContainer } from '../../domain/services/container/service.container'

export class PatientsController {
    private patientsService: PatientsService

    constructor() {
        this.patientsService = ServiceContainer.getPatientsService()
    }

    getPatients = async (req:Request, res:Response, next:NextFunction) => {
        const limit = Number(req.query.limit) || 25
        const offset = Number(req.query.offset) || 0

        try {
            const { patients, totalRegistries } = await this.patientsService.findAllPatients({limit, offset})
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

    getPatient = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = req.params 
        try {
            const patient = await this.patientsService.findOnePatient(+id)
            res.status( 200 ).json({
                data: { patient }
            })
        } catch ( err ) {
            next( err )
        }
    }

    insertPatient = async (req:Request, res:Response, next:NextFunction) => {
        const body = req.body
        try {
            const insertedPatient = await this.patientsService.insertPatient(body)
            res.status( 201 ).json({
                data: { patient: insertedPatient }
            })
        } catch ( err ) {
            next( err )
        }
    }

    updatePatient = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = req.params
        const body = req.body
        try {
            const updatedPatient = await this.patientsService.updatedPatient(body, Number(id))
            res.status( 200 ).json({
                data: {
                    patient: updatedPatient
                }
            })
        } catch ( err ) {
            next( err )
        }
    }

    deletePatient = async (req:Request, res:Response, next:NextFunction) => {
        const { id } = req.params
        try {
            const [isPatientDeleted, patientId] = await this.patientsService.softDeletePatient( Number(id) )
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