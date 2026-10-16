export const workOrderStatuses = ["OPEN", "SENT_TO_LAB", "IN_PRODUCTION", "RETURNED", "IN_INSPECTION", "READY", "AWAITING_PICKUP", "DELIVERED", "CANCELLED"] as const;
export type WorkOrderStatus = (typeof workOrderStatuses)[number];

export type WorkOrderEventType = "CREATED" | "STATUS" | "SCHEDULE" | "CANCELLED" | "INPUTS" | "LABORATORY";

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
  organizationId?: string;
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
  laboratory?: string;
  cancelReason?: string;
  events?: WorkOrderEvent[];
}

export const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  OPEN: "Aberta",
  SENT_TO_LAB: "Enviada ao laboratório",
  IN_PRODUCTION: "Em produção",
  RETURNED: "Retornada",
  IN_INSPECTION: "Em conferência",
  READY: "Pronta",
  AWAITING_PICKUP: "Cliente avisado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada",
};

export const workOrderEventLabels: Record<WorkOrderEventType, string> = {
  CREATED: "Ordem criada",
  STATUS: "Status alterado",
  SCHEDULE: "Prazo e observações",
  CANCELLED: "Cancelamento",
  INPUTS: "Insumos registrados",
  LABORATORY: "Laboratório informado",
};

export const workOrderTransitions: Record<WorkOrderStatus, readonly WorkOrderStatus[]> = {
  OPEN: ["SENT_TO_LAB", "IN_PRODUCTION", "CANCELLED"],
  SENT_TO_LAB: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["RETURNED", "READY", "CANCELLED"],
  RETURNED: ["IN_INSPECTION", "IN_PRODUCTION", "CANCELLED"],
  IN_INSPECTION: ["READY", "IN_PRODUCTION", "CANCELLED"],
  READY: ["AWAITING_PICKUP", "DELIVERED"],
  AWAITING_PICKUP: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return workOrderTransitions[from].includes(to);
}

// Canonical fabrication pipeline (order without the audited CANCELLED exit). Legacy orders with the old coarse statuses stay valid.
export const productionPipeline = ["OPEN", "SENT_TO_LAB", "IN_PRODUCTION", "RETURNED", "IN_INSPECTION", "READY", "AWAITING_PICKUP", "DELIVERED"] as const;
export type ProductionStage = (typeof productionPipeline)[number];

export function stageIndexOf(status: WorkOrderStatus): number {
  return (productionPipeline as readonly string[]).indexOf(status);
}

// Responsible and date of a stage come from the embedded history: CREATED for OPEN, the latest STATUS event that reached the stage (rework keeps the newest stamp).
export function stageEvent(order: Pick<WorkOrder, "events">, status: ProductionStage): WorkOrderEvent | undefined {
  const events = order.events ?? [];
  if (status === "OPEN") return events.find((event) => event.type === "CREATED");
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === "STATUS" && event.to === status) return event;
  }
  return undefined;
}
