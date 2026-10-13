import type { InventoryItem, InventoryMovement, InventoryMovementType, ProductCategory } from "./inventory";
import { isProductCategory, movementDelta } from "./inventory";
import type { InventoryRepository } from "./repositories";
import { isMoney } from "./money";

export interface InventoryItemInput {
  name: string;
  code?: string;
  quantity: number;
  minimumQuantity: number;
  defaultPrice?: number;
  cost?: number;
  category: ProductCategory;
  brand?: string;
  material?: string;
  description?: string;
}

const valid = (value: number) => Number.isFinite(value) && value >= 0;

function optionalText(value: string | undefined): string | undefined {
  const text = value?.trim() || undefined;
  return text;
}

function categoryOf(category: ProductCategory): ProductCategory {
  if (!isProductCategory(category)) throw new Error("Selecione a categoria do produto.");
  return category;
}

function optionalMoney(value: number | undefined, field: "defaultPrice" | "cost"): number | undefined {
  if (value === undefined) return undefined;
  if (!isMoney(value) || value < 0) throw new Error(field === "defaultPrice" ? "Informe um preço padrão válido." : "Informe um custo válido.");
  return value;
}

function requiredCode(value: string | undefined): string {
  const code = value?.trim() || "";
  if (!code) throw new Error("Informe o código do produto.");
  return code;
}

function assertCodeIsUnique(existing: readonly InventoryItem[], code: string, excludeId?: string): void {
  const normalized = code.toLowerCase();
  if (existing.some((other) => other.id !== excludeId && other.code?.trim().toLowerCase() === normalized)) throw new Error("Código já cadastrado nesta loja.");
}

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}
  list(storeId: string): Promise<InventoryItem[]> { return this.repository.listByStore(storeId); }
  history(storeId: string): Promise<InventoryMovement[]> { return this.repository.listMovements(storeId); }

  async create(storeId: string, input: InventoryItemInput, author?: string): Promise<InventoryItem> {
    if (!storeId?.trim()) throw new Error("Selecione uma loja.");
    const name = input.name.trim();
    if (!name) throw new Error("Informe o nome do produto.");
    const category = categoryOf(input.category);
    if (!valid(input.quantity) || !valid(input.minimumQuantity)) throw new Error("Informe saldo inicial e estoque mínimo válidos.");
    const code = requiredCode(input.code);
    assertCodeIsUnique(await this.repository.listByStore(storeId), code);
    const item: InventoryItem = { id: `item-${crypto.randomUUID()}`, storeId, name, code, quantity: input.quantity, minimumQuantity: input.minimumQuantity, defaultPrice: optionalMoney(input.defaultPrice, "defaultPrice"), cost: optionalMoney(input.cost, "cost"), category, brand: optionalText(input.brand), material: optionalText(input.material), description: optionalText(input.description) };
    const initial: InventoryMovement | undefined = input.quantity > 0 ? { id: `movement-${crypto.randomUUID()}`, itemId: item.id, storeId, type: "IN", quantity: input.quantity, reason: "Estoque inicial", createdAt: new Date().toISOString(), author } : undefined;
    await this.repository.createItem(item, initial);
    return item;
  }

  async update(item: InventoryItem, input: { name: string; code?: string; minimumQuantity: number; defaultPrice?: number; cost?: number; category: ProductCategory; brand?: string; material?: string; description?: string }): Promise<InventoryItem> {
    const name = input.name.trim();
    if (!name) throw new Error("Informe o nome do produto.");
    const category = categoryOf(input.category);
    if (!valid(input.minimumQuantity)) throw new Error("Informe um estoque mínimo válido.");
    const code = requiredCode(input.code);
    assertCodeIsUnique(await this.repository.listByStore(item.storeId), code, item.id);
    const updated: InventoryItem = { ...item, name, code, minimumQuantity: input.minimumQuantity, defaultPrice: optionalMoney(input.defaultPrice, "defaultPrice"), cost: optionalMoney(input.cost, "cost"), category, brand: optionalText(input.brand), material: optionalText(input.material), description: optionalText(input.description) };
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
