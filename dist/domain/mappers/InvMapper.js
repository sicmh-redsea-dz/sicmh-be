"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvMapper = void 0;
class InvMapper {
}
exports.InvMapper = InvMapper;
InvMapper.toInvResponse = (invRecord) => {
    const { ProductoID: id, NombreProducto: prodName, Descripcion: prodDesc, PrecioUnidad: prodUnitPrice, Cantidad: prodQuantity, NivelMinimoStock: prodMinStock } = invRecord;
    return {
        id,
        prodName,
        prodDesc,
        prodUnitPrice,
        prodQuantity,
        prodMinStock
    };
};
InvMapper.toInvFormResponse = (invRecord) => {
    const { prodDesc: Descripcion, prodMinStock: NivelMinimoStock, prodName: NombreProducto, prodQty: Cantidad, prodUnitPrice: PrecioUnidad, } = invRecord;
    return {
        Descripcion,
        NivelMinimoStock,
        NombreProducto,
        Cantidad,
        PrecioUnidad
    };
};
