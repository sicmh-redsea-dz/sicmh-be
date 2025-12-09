export class InvMapper {
    static toInvResponse = ( invRecord: any ) => {
        const {
            ProductoID: id,
            NombreProducto: prodName,
            Descripcion: prodDesc,
            PrecioUnidad: prodUnitPrice,
            Cantidad: prodQuantity,
            NivelMinimoStock: prodMinStock
        } = invRecord

        return {
            id,
            prodName,
            prodDesc,
            prodUnitPrice,
            prodQuantity,
            prodMinStock
        }
    }

    static toInvFormResponse = ( invRecord: any ) => {
        const {
            prodDesc: Descripcion,
            prodMinStock: NivelMinimoStock,
            prodName: NombreProducto,
            prodQty: Cantidad,
            prodUnitPrice: PrecioUnidad,
        } = invRecord

        return {
            Descripcion,
            NivelMinimoStock,
            NombreProducto,
            Cantidad,
            PrecioUnidad
        }
    }
}