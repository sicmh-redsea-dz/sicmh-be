import { ServiceContainer } from "../../infrastructure/container/service.container"
import { DashbService } from "../../application/services/dashboard.service"
import { asyncHandler } from "../decorators/asyncHandler"


export class DashboardController {

    private dashbService: DashbService

    constructor() {
        this.dashbService = ServiceContainer.getDashbService()
    }

    @asyncHandler()
    async getData(): Promise<any> {
        return this.dashbService.getData()
    }
}
