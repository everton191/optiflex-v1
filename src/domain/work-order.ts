export type WorkOrderStatus = "OPEN" | "IN_PRODUCTION" | "READY" | "DELIVERED" | "CANCELLED";

export interface WorkOrder {
  id: string;
  saleId: string;
  customerId: string;
  storeId: string;
  status: WorkOrderStatus;
  createdAt: string;
}
