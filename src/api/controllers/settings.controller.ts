import { Request } from 'express'
import { ServiceContainer } from '../../infrastructure/container/service.container'
import { SettingsService } from '../../application/services/settings.service'
import { asyncHandler } from '../decorators/asyncHandler'

export class SettingsController {
  private settingsService: SettingsService

  constructor() {
    this.settingsService = ServiceContainer.getSettingsService()
  }

  @asyncHandler()
  async getProfile(req: Request): Promise<any> {
    const currentUser = (req as any).currentUser
    return await this.settingsService.getProfile(Number(currentUser?._id))
  }

  @asyncHandler()
  async updateProfile(req: Request): Promise<any> {
    const currentUser = (req as any).currentUser
    const payload = req.body ?? {}
    return await this.settingsService.updateProfile(Number(currentUser?._id), currentUser?.fireUID, payload)
  }

  @asyncHandler()
  async listRoles(): Promise<any> {
    const roles = await this.settingsService.listRoles()
    return { roles }
  }

  @asyncHandler()
  async listUsers(): Promise<any> {
    const users = await this.settingsService.listUsers()
    return { users }
  }

  @asyncHandler()
  async updateUserRole(req: Request): Promise<any> {
    const { id } = req.params
    const roleId = Number(req.body?.roleId)
    return await this.settingsService.updateUserRole(Number(id), roleId)
  }

  @asyncHandler()
  async inviteUser(req: Request): Promise<any> {
    const payload = req.body ?? {}
    return await this.settingsService.inviteUser(payload)
  }

  @asyncHandler()
  async getRolePermissions(): Promise<any> {
    return await this.settingsService.getRolePermissions()
  }

  @asyncHandler()
  async updateRolePermissions(req: Request): Promise<any> {
    const { roleKey } = req.params as { roleKey: string }
    const { grants = [], revokes = [] } = req.body ?? {}
    const actorId = Number((req as any).currentUser?._id)
    return await this.settingsService.updateRolePermissions(roleKey, grants, revokes, actorId || undefined)
  }

  @asyncHandler()
  async getUserPermissions(): Promise<any> {
    return await this.settingsService.getUserPermissions()
  }

  @asyncHandler()
  async updateUserPermissions(req: Request): Promise<any> {
    const { userId } = req.params as { userId: string }
    const { grants = [], revokes = [] } = req.body ?? {}
    const actorId = Number((req as any).currentUser?._id)
    return await this.settingsService.updateUserPermissions(Number(userId), grants, revokes, actorId || undefined)
  }
}
