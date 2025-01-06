import { Pool } from "mysql2/promise";
import { queries } from "../helper/invoices/queries";

export class InvoiceService {
  constructor(private pool: Pool) { }

  public async findAll() {
    let query = queries('get')
    try {
      const [response] = await this.pool.execute<[any[], any]>(query)
      return response
    } catch( err: any ) {
      throw new Error( err.message )
    }
  }
}