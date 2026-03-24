export interface InvoiceRepository {
    findAll(args: { limit: number; offset: number; term: string }): Promise<any[]>
    findByInvoiceNumber(invoiceNumber: string): Promise<Record<string, any> | null>
    findLatestPendingByPatientAndDate(patientId: number, occurredAt: string): Promise<Record<string, any> | null>
    create(data: Record<string, any>): Promise<number>
    updateByInvoiceNumber(invoiceNumber: string, data: Record<string, any>): Promise<void>
    incrementAmountById(invoiceId: number, delta: number): Promise<void>
    softDeleteByInvoiceNumber(invoiceNumber: string): Promise<void>
    fetchServices(): Promise<any[]>
    fetchPaymentMethods(): Promise<any[]>
    fetchDoctors(): Promise<any[]>
    fetchReportHeader(term?: string): Promise<any[]>
    fetchReportSummary(term?: string): Promise<any[]>
    fetchReportPayments(term?: string): Promise<any[]>
    fetchReportCashbox(term?: string): Promise<any[]>
}
