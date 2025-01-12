import { Router } from "express";
import { getStockEntries } from "../controllers/stock.controller";

const router = Router();

router.get('/', getStockEntries);

export default router;