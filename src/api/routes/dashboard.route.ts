import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controlller";


const router = Router()

const dashb = new DashboardController()

router.get(
    '/', 
    dashb.getData.bind( dashb )
)

export { router as dashbRoutes }