import { Request } from 'express'
import { asyncHandler } from '../decorators/asyncHandler'
import { ServiceContainer } from '../../infrastructure/container/service.container'

export class OrRoomsController {
  private readonly roomsService = ServiceContainer.getOrRoomsService()

  @asyncHandler()
  async getRooms(_req: Request): Promise<any> {
    return this.roomsService.getRooms()
  }

  @asyncHandler()
  async createRoom(req: Request): Promise<any> {
    const actor = this.resolveActor(req)
    return this.roomsService.createRoom(req.body, actor)
  }

  @asyncHandler()
  async updateRoom(req: Request): Promise<any> {
    const id = String(req.params.roomId)
    const actor = this.resolveActor(req)
    return this.roomsService.updateRoom(id, req.body, actor)
  }

  @asyncHandler()
  async assignRoom(req: Request): Promise<any> {
    const id = String(req.params.roomId)
    const actor = this.resolveActor(req)
    return this.roomsService.assignRoom(id, req.body, actor)
  }

  @asyncHandler()
  async releaseRoom(req: Request): Promise<any> {
    const id = String(req.params.roomId)
    const actor = this.resolveActor(req)
    return this.roomsService.releaseRoom(id, req.body, actor)
  }

  private resolveActor(req: Request) {
    const user = (req as any).currentUser
    if (!user) return undefined
    return { id: user._id, name: user.name, role: user.roles?.[0] }
  }
}
