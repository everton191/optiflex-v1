import type { Sale } from "./sales";
import type { WorkOrder } from "./work-order";
import type { WorkOrderRepository } from "./repositories";

export class WorkOrderService {
  constructor(private readonly repository: WorkOrderRepository) {}
  list(storeId: string): Promise<WorkOrder[]> { return this.repository.listByStore(storeId); }
  async createFromConfirmedSale(sale: Sale): Promise<WorkOrder> {
    if (sale.status !== "CONFIRMED") throw new Error("A OS só pode ser criada após confirmar a venda.");
    const existing = await this.repository.getBySale(sale.id);
    if (existing) return existing;
    const order: WorkOrder = { id: `os-${crypto.randomUUID()}`, saleId: sale.id, customerId: sale.customerId, storeId: sale.storeId, status: "OPEN", createdAt: new Date().toISOString() };
    await this.repository.save(order); return order;
  }
}
