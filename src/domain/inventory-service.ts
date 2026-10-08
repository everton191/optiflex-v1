import type { InventoryItem, InventoryMovement, InventoryMovementType } from "./inventory";
import { movementDelta } from "./inventory";
import type { InventoryRepository } from "./repositories";

export interface InventoryItemInput {
  name: string;
  code?: string;
  quantity: number;
  minimumQuantity: number;
}

const valid = (value: number) => Number.isFinite(value) && value >= 0;

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}
  list(storeId: string): Promise<InventoryItem[]> { return this.repository.listByStore(storeId); }
  history(storeId: string): Promise<InventoryMovement[]> { return this.repository.listMovements(storeId); }

  async create(storeId: string, input: InventoryItemInput, author?: string): Promise<InventoryItem> {
    if (!storeId?.trim()) throw new Error("Selecione uma loja.");
    const name = input.name.trim();
    if (!name) throw new Error("Informe o nome do produto.");
    if (!valid(input.quantity) || !valid(input.minimumQuantity)) throw new Error("Informe saldo inicial e estoque mínimo válidos.");
    const item: InventoryItem = { id: `item-${crypto.randomUUID()}`, storeId, name, code: input.code?.trim() || undefined, quantity: input.quantity, minimumQuantity: input.minimumQuantity };
    const initial: InventoryMovement | undefined = input.quantity > 0 ? { id: `movement-${crypto.randomUUID()}`, itemId: item.id, storeId, type: "IN", quantity: input.quantity, reason: "Estoque inicial", createdAt: new Date().toISOString(), author } : undefined;
    await this.repository.createItem(item, initial);
    return item;
  }

  async update(item: InventoryItem, input: { name: string; code?: string; minimumQuantity: number }): Promise<InventoryItem> {
    const name = input.name.trim();
    if (!name) throw new Error("Informe o nome do produto.");
    if (!valid(input.minimumQuantity)) throw new Error("Informe um estoque mínimo válido.");
    const updated: InventoryItem = { ...item, name, code: input.code?.trim() || undefined, minimumQuantity: input.minimumQuantity };
    await this.repository.updateItem(updated);
    return updated;
  }

  async adjust(item: InventoryItem, type: InventoryMovementType, quantity: number, reason: string, author?: string): Promise<InventoryItem> {
    const motive = reason.trim();
    if (!motive) throw new Error("Informe o motivo da movimentação.");
    if (!Number.isFinite(quantity) || quantity === 0) throw new Error("Informe uma quantidade válida.");
    if (type !== "ADJUSTMENT" && quantity < 0) throw new Error("Informe uma quantidade maior que zero.");
    if (item.quantity + movementDelta({ type, quantity }) < 0) throw new Error("Saldo insuficiente para esta movimentação.");
    const movement: InventoryMovement = { id: `movement-${crypto.randomUUID()}`, itemId: item.id, storeId: item.storeId, type, quantity, reason: motive, createdAt: new Date().toISOString(), author };
    return this.repository.applyMovement(movement);
  }
}
