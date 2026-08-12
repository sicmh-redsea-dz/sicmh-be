import { Router } from 'express'
import { InvController } from '../controllers/inv.controller'
import { requireInventoryLocationPermissions, requirePermissions } from '../middlewares/permission.middleware'

const router = Router()

const inventoryController = new InvController()

router.get(
    '/',
    requirePermissions('inventory.read'),
    requireInventoryLocationPermissions('query'),
    inventoryController.getInventory.bind( inventoryController )
)

router.get(
    '/:id',
    requirePermissions('inventory.read'),
    inventoryController.getInventoryById.bind( inventoryController )
)

router.post(
    '/transfer',
    requirePermissions('inventory.transfer'),
    requireInventoryLocationPermissions('transfer'),
    inventoryController.transferInventory.bind( inventoryController )
)

router.post(
    '/new-item',
    requirePermissions('inventory.create'),
    inventoryController.createArticle.bind( inventoryController )
)

router.patch(
    '/edit-item/:id',
    requirePermissions('inventory.update'),
    inventoryController.patchArticle.bind( inventoryController )
)

export { router as invRoutes }
