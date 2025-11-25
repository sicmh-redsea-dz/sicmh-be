import { Router } from 'express'
import { InvController } from '../controllers/inv.controller'

const router = Router()

const inventoryController = new InvController()

router.get(
    '/',
    inventoryController.getInventory.bind( inventoryController )
)

router.get(
    '/:id',
    inventoryController.getInventoryById.bind( inventoryController )
)

router.post(
    '/transfer',
    inventoryController.transferInventory.bind( inventoryController )
)

export { router as invRoutes }