export type WorkOrderStatus = "OPEN" | "IN_PRODUCTION" | "READY" | "DELIVERED" | "CANCELLED";

export interface WorkOrder {
  id: string;
  saleId: string;
  customerId: string;
  storeId: string;
  status: WorkOrderStatus;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  dueAt?: string;
  notes?: string;
}

export const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  OPEN: "Aberta",
  IN_PRODUCTION: "Em produção",
  READY: "Pronta",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada",
};

export const workOrderTransitions: Record<WorkOrderStatus, readonly WorkOrderStatus[]> = {
  OPEN: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["READY", "CANCELLED"],
  READY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return workOrderTransitions[from].includes(to);
}
