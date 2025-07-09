export class InvoiceMapper {
    static toResp = ( invoice: Record<string, any> ) => {
        const {
            FacturaID: id,
            PacienteID: patientId,
            PersonalID: doctorId,
            FechaFactura: date,
            Monto: amount
        } = invoice

        return {
            id,
            patientId,
            doctorId,
            date,
            amount
        }
    }

    static toDbForm = ( newInv: any ) => {
        const {
            patient: PacienteID,
            date: FechaFactura,
            amount: Monto,
            state: Estado,
            ensurance: AseguradoraID,
            elderlyDiscount: DescuentoElderly,
            promCode: CodigoPromocional,
            discount: DescuentoPromocional,
            rtn: RTN,
            cai: CAI,
            invoiceNum: InvoiceNumber,
            pMethod: TipoPagoID,
            IsActive,
            doctor: PersonalID
        } = newInv
    
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
        }
    }
}