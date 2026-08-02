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
    return await this.settingsService.getProfile(String(currentUser?._id))
  }

  @asyncHandler()
  async updateProfile(req: Request): Promise<any> {
    const currentUser = (req as any).currentUser
    const payload = req.body ?? {}
    return await this.settingsService.updateProfile(String(currentUser?._id), currentUser?.fireUID, payload)
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
    const roleId = String(req.body?.roleId)
    return await this.settingsService.updateUserRole(String(id), roleId)
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
    const actorId = String((req as any).currentUser?._id || '')
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
    const actorId = String((req as any).currentUser?._id || '')
    return await this.settingsService.updateUserPermissions(String(userId), grants, revokes, actorId || undefined)
  }

  @asyncHandler()
  async deleteUser(req: Request): Promise<any> {
    const { id } = req.params
    return await this.settingsService.deleteUser(String(id))
  }

  @asyncHandler()
  async changeUserPassword(req: Request): Promise<any> {
    const { id } = req.params
    const { newPassword } = req.body ?? {}
    return await this.settingsService.changeUserPassword(String(id), newPassword)
  }
}
