import type { InventoryItem, InventoryMovementType } from "./inventory";
import type { InventoryRepository } from "./repositories";

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}
  list(storeId: string): Promise<InventoryItem[]> { return this.repository.listByStore(storeId); }
  async adjust(item: InventoryItem, type: InventoryMovementType, quantity: number, reason: string): Promise<void> {
    if (quantity <= 0 || !reason.trim()) throw new Error("Informe quantidade e motivo.");
    const nextQuantity = type === "OUT" ? item.quantity - quantity : item.quantity + quantity;
    if (nextQuantity < 0) throw new Error("Estoque insuficiente.");
    await this.repository.saveItem({ ...item, quantity: nextQuantity });
    await this.repository.addMovement({ id: `movement-${crypto.randomUUID()}`, itemId: item.id, storeId: item.storeId, type, quantity, reason, createdAt: new Date().toISOString() });
  }
}
