export type WorkOrderStatus = "OPEN" | "IN_PRODUCTION" | "READY" | "DELIVERED" | "CANCELLED";

export type WorkOrderEventType = "CREATED" | "STATUS" | "SCHEDULE" | "CANCELLED" | "INPUTS";

export interface WorkOrderEvent {
  id: string;
  type: WorkOrderEventType;
  from?: WorkOrderStatus;
  to?: WorkOrderStatus;
  note?: string;
  author: string;
  at: string;
}

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
  cancelReason?: string;
  events?: WorkOrderEvent[];
}

export const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  OPEN: "Aberta",
  IN_PRODUCTION: "Em produção",
  READY: "Pronta",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada",
};

export const workOrderEventLabels: Record<WorkOrderEventType, string> = {
  CREATED: "Ordem criada",
  STATUS: "Status alterado",
  SCHEDULE: "Prazo e observações",
  CANCELLED: "Cancelamento",
  INPUTS: "Insumos registrados",
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
