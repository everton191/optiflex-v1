export type SaleStatus = "QUOTE" | "CONFIRMED" | "CANCELLED";
export type SalePaymentStatus = "PENDING" | "PAID";
export interface Sale {
  id: string;
  customerId: string;
  storeId: string;
  status: SaleStatus;
  paymentStatus?: SalePaymentStatus;
  description: string;
  total: number;
  createdAt: string;
}
