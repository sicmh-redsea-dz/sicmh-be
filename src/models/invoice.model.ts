export interface InvoiceForm {
  date:    Date;
  doctor:  string;
  pMethod: string;
  patient: string;
  amount: string;
  service: number[];
  stock: Stock[];
}

interface Stock {
  id: number,
  qty: number
}