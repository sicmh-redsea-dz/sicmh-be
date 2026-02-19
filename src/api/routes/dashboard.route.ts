import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controlller";
import { requirePermissions } from '../middlewares/permission.middleware';


const router = Router()

const dashb = new DashboardController()

router.get(
    '/', 
    requirePermissions('dashboard.view'),
    dashb.getData.bind( dashb )
)

export { router as dashbRoutes }
