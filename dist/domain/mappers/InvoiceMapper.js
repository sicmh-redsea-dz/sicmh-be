"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceMapper = void 0;
class InvoiceMapper {
}
exports.InvoiceMapper = InvoiceMapper;
InvoiceMapper.toResp = (invoice) => {
    const { FacturaID: id, PacienteID: patientId, PersonalID: doctorId, FechaFactura: date, Monto: amount, TipoVisita: visitType } = invoice;
    return {
        id,
        patientId,
        doctorId,
        date,
        amount,
        visitType
    };
};
InvoiceMapper.toDbForm = (newInv) => {
    const { patient: PacienteID, date: FechaFactura, amount: Monto, state: Estado, ensurance: AseguradoraID, elderlyDiscount: DescuentoElderly, promCode: CodigoPromocional, discount: DescuentoPromocional, rtn: RTN, cai: CAI, invoiceNum: InvoiceNumber, pMethod: TipoPagoID, IsActive, doctor: PersonalID } = newInv;
    return {
        PacienteID,
        FechaFactura,
        Monto,
        Estado,
        AseguradoraID,
        DescuentoElderly,
        CodigoPromocional,
        DescuentoPromocional,
        RTN,
        CAI,
        InvoiceNumber,
        TipoPagoID,
        IsActive,
        PersonalID
    };
};
