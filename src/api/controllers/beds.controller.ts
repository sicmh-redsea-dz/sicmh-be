import { Request } from 'express'
import { asyncHandler } from '../decorators/asyncHandler'
import { ServiceContainer } from '../../infrastructure/container/service.container'

export class BedsController {
  private readonly bedsService = ServiceContainer.getBedsService()

  @asyncHandler()
  async getBeds(req: Request): Promise<any> {
    const module = String(req.params.module)
    return this.bedsService.getBeds(module)
  }

  @asyncHandler()
  async createBed(req: Request): Promise<any> {
    const module = String(req.params.module)
    const actor = this.resolveActor(req)
    return this.bedsService.createBed(module, req.body, actor)
  }

  @asyncHandler()
  async updateBed(req: Request): Promise<any> {
    const module = String(req.params.module)
    const id = String(req.params.bedId)
    const actor = this.resolveActor(req)
    return this.bedsService.updateBed(module, id, req.body, actor)
  }

  @asyncHandler()
  async assignBed(req: Request): Promise<any> {
    const module = String(req.params.module)
    const id = String(req.params.bedId)
    const actor = this.resolveActor(req)
    return this.bedsService.assignBed(module, id, req.body, actor)
  }

  @asyncHandler()
  async releaseBed(req: Request): Promise<any> {
    const module = String(req.params.module)
    const id = String(req.params.bedId)
    const actor = this.resolveActor(req)
    return this.bedsService.releaseBed(module, id, req.body, actor)
  }

  private resolveActor(req: Request) {
    const user = (req as any).currentUser
    if (!user) return undefined
    return { id: user._id, name: user.name, role: user.roles?.[0] }
  }
}
