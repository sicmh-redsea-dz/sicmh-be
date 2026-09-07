import { Request } from 'express'
import { PatientsService } from '../../application/services/patients.service'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { asyncHandler } from '../decorators/asyncHandler'

export class PatientsController {
    private patientsService: PatientsService

    constructor() {
        this.patientsService = ServiceContainer.getPatientsService()
    }

    @asyncHandler({ mode: 'payload', statusCode: 202 })
    async getPatients(req:Request): Promise<any> {
        const limit = Number(req.query.limit) || 25
        const offset = Number(req.query.offset) || 0
        const term = String(req.query.term) || ''

        const { patients, totalRegistries } = await this.patientsService.findAllPatients({limit, offset, term})
        return {
            data: {
                patients,
                totalRegistries
            }
        }
    }

    @asyncHandler({ mode: 'payload' })
    async getPatient(req:Request): Promise<any> {
        const { id } = req.params
        const patient = await this.patientsService.findOnePatient(id)
        return {
            data: { patient }
        }
    }

    @asyncHandler({ mode: 'payload', statusCode: 201 })
    async insertPatient(req:Request): Promise<any> {
        const body = req.body

        const insertedPatient = await this.patientsService.insertPatient(body)
        return {
            data: { patient: insertedPatient }
        }
    }

    @asyncHandler({ mode: 'payload' })
    async updatePatient(req:Request): Promise<any> {
        const { id } = req.params
        const body = req.body
        const updatedPatient = await this.patientsService.updatedPatient(body, id)
        return {
            data: {
                patient: updatedPatient
            }
        }
    }

    @asyncHandler({ mode: 'payload' })
    async deletePatient(req:Request): Promise<any> {
        const { id } = req.params
        const [isPatientDeleted, patientId] = await this.patientsService.softDeletePatient(id)
        return {
            data: {
              msg: 'ok',
              status: isPatientDeleted && 'deleted',
              patientId
            }
        }
    }
}
