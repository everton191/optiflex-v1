export type SaleStatus = "QUOTE" | "CONFIRMED" | "CANCELLED";
export interface Sale {
  id: string;
  customerId: string;
  storeId: string;
  status: SaleStatus;
  description: string;
  total: number;
  createdAt: string;
}
