import type { Sale } from "./sales";
import type { WorkOrder, WorkOrderStatus } from "./work-order";
import { canTransition } from "./work-order";
import type { WorkOrderRepository } from "./repositories";

export interface WorkOrderScheduleInput {
  dueAt?: string;
  notes?: string;
}

export class WorkOrderService {
  constructor(private readonly repository: WorkOrderRepository) {}
  list(storeId: string): Promise<WorkOrder[]> { return this.repository.listByStore(storeId); }
  getBySale(saleId: string): Promise<WorkOrder | undefined> { return this.repository.getBySale(saleId); }

  async createFromConfirmedSale(sale: Sale): Promise<WorkOrder> {
    if (sale.status !== "CONFIRMED") throw new Error("A OS só pode ser criada após confirmar a venda.");
    const order: WorkOrder = { id: `os-${crypto.randomUUID()}`, saleId: sale.id, customerId: sale.customerId, storeId: sale.storeId, status: "OPEN", createdAt: new Date().toISOString() };
    return this.repository.create(order);
  }

  async transition(order: WorkOrder, status: WorkOrderStatus, author: string): Promise<WorkOrder> {
    if (!author.trim()) throw new Error("Informe o responsável pela alteração.");
    if (order.status === status) throw new Error("A ordem já está neste status.");
    if (!canTransition(order.status, status)) throw new Error(`Transição inválida: ${order.status} → ${status}.`);
    const updated: WorkOrder = { ...order, status, updatedAt: new Date().toISOString(), updatedBy: author.trim() };
    return this.repository.update(updated, order.status);
  }

  async schedule(order: WorkOrder, input: WorkOrderScheduleInput, author: string): Promise<WorkOrder> {
    if (!author.trim()) throw new Error("Informe o responsável pela alteração.");
    const dueAt = input.dueAt?.trim() || undefined;
    const notes = input.notes?.trim() || undefined;
    if (dueAt && !Number.isFinite(Date.parse(dueAt))) throw new Error("Informe um prazo válido.");
    const updated: WorkOrder = { ...order, dueAt, notes, updatedAt: new Date().toISOString(), updatedBy: author.trim() };
    return this.repository.update(updated, order.status);
  }
}
