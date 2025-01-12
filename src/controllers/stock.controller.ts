import { Request, Response } from "express";
import { StockService } from "../services/stock.srvc";
import { pool } from "../config/database";

const stockService = new StockService(pool)

export const getStockEntries = async (req: Request, res: Response) => {
  const response = await stockService.findall()
  res.status(200).json({
    data: response,
    totalCount: response.length
  })
}