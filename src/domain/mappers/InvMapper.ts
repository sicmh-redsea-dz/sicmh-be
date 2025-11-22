export class InvMapper {
    static toInvResponse = ( invRecord: any ) => {
        const {
            ProductoID: id,
            NombreProducto: prodName,
            Descripcion: prodDesc,
            PrecioUnidad: prodUnitPrice,
            Cantidad: prodQuantity,
        } = invRecord

        return {
            id,
            prodName,
            prodDesc,
            prodUnitPrice,
            prodQuantity,
        }
    }
}