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

router.post(
    '/new-item',
    inventoryController.createArticle.bind( inventoryController )
)

router.patch(
    '/edit-item/:id',
    inventoryController.patchArticle.bind( inventoryController )
)

export { router as invRoutes }