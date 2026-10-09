import type { InventoryMovement } from "./inventory";
import type { Sale } from "./sales";
import type { WorkOrder, WorkOrderEvent, WorkOrderStatus } from "./work-order";
import { canTransition } from "./work-order";
import type { WorkOrderRepository } from "./repositories";

export interface WorkOrderScheduleInput {
  dueAt?: string;
  notes?: string;
}

export interface WorkOrderInput {
  itemId: string;
  name: string;
  quantity: number;
}

export class WorkOrderService {
  constructor(private readonly repository: WorkOrderRepository) {}
  list(storeId: string): Promise<WorkOrder[]> { return this.repository.listByStore(storeId); }
  getBySale(saleId: string): Promise<WorkOrder | undefined> { return this.repository.getBySale(saleId); }

  async createFromConfirmedSale(sale: Sale, author = ""): Promise<WorkOrder> {
    if (sale.status !== "CONFIRMED") throw new Error("A OS só pode ser criada após confirmar a venda.");
    const createdAt = new Date().toISOString();
    const order: WorkOrder = {
      id: `os-${crypto.randomUUID()}`, saleId: sale.id, customerId: sale.customerId, storeId: sale.storeId, status: "OPEN", createdAt,
      events: [{ id: `os-event-${crypto.randomUUID()}`, type: "CREATED", author: author.trim(), at: createdAt }],
    };
    return this.repository.create(order);
  }

  async transition(order: WorkOrder, status: WorkOrderStatus, author: string): Promise<WorkOrder> {
    if (!author.trim()) throw new Error("Informe o responsável pela alteração.");
    if (status === "CANCELLED") throw new Error("Cancelamento auditado: use a ação Cancelar e informe o motivo.");
    if (order.status === status) throw new Error("A ordem já está neste status.");
    if (!canTransition(order.status, status)) throw new Error(`Transição inválida: ${order.status} → ${status}.`);
    const at = new Date().toISOString();
    const updated: WorkOrder = { ...order, status, updatedAt: at, updatedBy: author.trim(), events: [...(order.events ?? []), { id: `os-event-${crypto.randomUUID()}`, type: "STATUS", from: order.status, to: status, author: author.trim(), at }] };
    return this.repository.update(updated, order.status);
  }

  async cancel(order: WorkOrder, reason: string, author: string): Promise<WorkOrder> {
    if (!author.trim()) throw new Error("Informe o responsável pela alteração.");
    if (order.status === "CANCELLED") throw new Error("A ordem já está cancelada.");
    if (!canTransition(order.status, "CANCELLED")) throw new Error(`Transição inválida: ${order.status} → CANCELLED.`);
    const trimmed = reason.trim();
    if (!trimmed) throw new Error("Informe o motivo do cancelamento.");
    const at = new Date().toISOString();
    const updated: WorkOrder = { ...order, status: "CANCELLED", cancelReason: trimmed, updatedAt: at, updatedBy: author.trim(), events: [...(order.events ?? []), { id: `os-event-${crypto.randomUUID()}`, type: "CANCELLED", from: order.status, to: "CANCELLED", note: trimmed, author: author.trim(), at }] };
    return this.repository.update(updated, order.status);
  }

  async schedule(order: WorkOrder, input: WorkOrderScheduleInput, author: string): Promise<WorkOrder> {
    if (!author.trim()) throw new Error("Informe o responsável pela alteração.");
    const dueAt = input.dueAt?.trim() || undefined;
    const notes = input.notes?.trim() || undefined;
    if (dueAt && !Number.isFinite(Date.parse(dueAt))) throw new Error("Informe um prazo válido.");
    const at = new Date().toISOString();
    const note = `${dueAt ? `Prazo: ${new Date(dueAt).toLocaleDateString("pt-BR")}` : "Sem prazo"}${notes ? ` · ${notes}` : ""}`;
    const updated: WorkOrder = { ...order, dueAt, notes, updatedAt: at, updatedBy: author.trim(), events: [...(order.events ?? []), { id: `os-event-${crypto.randomUUID()}`, type: "SCHEDULE", note, author: author.trim(), at }] };
    return this.repository.update(updated, order.status);
  }

  async recordInputs(order: WorkOrder, items: readonly WorkOrderInput[], author: string): Promise<WorkOrder> {
    if (!author.trim()) throw new Error("Informe o responsável pela alteração.");
    if (order.status === "DELIVERED" || order.status === "CANCELLED") throw new Error("Insumos só podem ser registrados antes da entrega.");
    if (!items.length) throw new Error("Informe ao menos um insumo.");
    if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) throw new Error("Quantidade inválida para o insumo.");
    const at = new Date().toISOString();
    const movements: InventoryMovement[] = items.map((item) => ({ id: `movement-${crypto.randomUUID()}`, itemId: item.itemId, storeId: order.storeId, type: "OUT", quantity: item.quantity, reason: `Insumos OS ${order.id}`, createdAt: at, author: author.trim() }));
    const note = items.map((item) => `${item.name} × ${item.quantity}`).join(", ");
    const updated: WorkOrder = { ...order, updatedAt: at, updatedBy: author.trim(), events: [...(order.events ?? []), { id: `os-event-${crypto.randomUUID()}`, type: "INPUTS", note, author: author.trim(), at }] };
    return this.repository.recordInputs(updated, movements, order.status);
  }
}
