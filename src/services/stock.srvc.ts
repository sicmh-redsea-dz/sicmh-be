import { Pool } from "mysql2/promise";
import { queries } from "../helper/stock/queries";

export class StockService {
  constructor(private pool: Pool) { }

  public async findall() {
    let query = queries('get')
    try {
      const [ response ] = await this.pool.execute<[any[], any]>(query)
      const formattedData = this.formatData( response )
      return formattedData
    }catch( err: any ) {
      throw new Error(err.message)
    }
  }

  private formatData( data: any[] ): any[] {

    return data.map(( item: any ) => {
      return {
        id: item.ProductoID,
        productName: item.NombreProducto,
        productDescription: item.Descripcion,
        quantity: item.Cantidad
      }
    })
  }
}