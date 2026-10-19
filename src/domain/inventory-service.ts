import type { InventoryItem, InventoryMovement, InventoryMovementType, ProductCategory, ProductVariantAttributes } from "./inventory";
import { availableQuantity, buildVariantName, hasVariantAttributes, isProductCategory, movementDelta, normalizeVariantAttributes, variantCodeSuffix } from "./inventory";
import { defaultOrganization } from "./access";
import type { InventoryRepository } from "./repositories";
import type { AuditService } from "./audit-service";
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
  variantAttributes?: Partial<ProductVariantAttributes>;
}

export interface VariantInput {
  attributes: Partial<ProductVariantAttributes>;
  quantity: number;
  code?: string;
  minimumQuantity?: number;
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
  constructor(private readonly repository: InventoryRepository, private readonly audit?: AuditService) {}
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
    const variantAttributes = normalizeVariantAttributes(category, input.variantAttributes ?? {});
    const item: InventoryItem = { id: `item-${crypto.randomUUID()}`, storeId, name, code, quantity: input.quantity, minimumQuantity: input.minimumQuantity, defaultPrice: optionalMoney(input.defaultPrice, "defaultPrice"), cost: optionalMoney(input.cost, "cost"), category, brand: optionalText(input.brand), material: optionalText(input.material), description: optionalText(input.description), organizationId: defaultOrganization.id };
    if (hasVariantAttributes(variantAttributes)) item.variantAttributes = variantAttributes;
    const initial: InventoryMovement | undefined = input.quantity > 0 ? { id: `movement-${crypto.randomUUID()}`, itemId: item.id, storeId, type: "IN", quantity: input.quantity, reason: "Estoque inicial", createdAt: new Date().toISOString(), author, organizationId: defaultOrganization.id } : undefined;
    await this.repository.createItem(item, initial);
    return item;
  }

  async createVariant(base: InventoryItem, input: VariantInput, author?: string): Promise<InventoryItem> {
    if (!base.category) throw new Error("O produto base precisa de categoria para gerar variantes.");
    if (!valid(input.quantity)) throw new Error("Informe um saldo inicial válido para a variante.");
    const attributes = normalizeVariantAttributes(base.category, input.attributes);
    if (!hasVariantAttributes(attributes)) throw new Error("Informe ao menos um atributo da variante.");
    const storeItems = await this.repository.listByStore(base.storeId);
    const name = buildVariantName(base.name, attributes);
    let code = (input.code?.trim() || `${base.code ?? "VAR"}-${variantCodeSuffix(attributes)}`).toUpperCase();
    while (storeItems.some((other) => other.code?.trim().toLowerCase() === code.toLowerCase())) code = `${code}-2`;
    const item: InventoryItem = { id: `item-${crypto.randomUUID()}`, storeId: base.storeId, name, code, quantity: input.quantity, minimumQuantity: input.minimumQuantity ?? base.minimumQuantity, defaultPrice: base.defaultPrice, cost: base.cost, category: base.category, brand: base.brand, material: attributes.material ?? base.material, description: base.description, organizationId: base.organizationId ?? defaultOrganization.id, variantAttributes: attributes };
    const initial: InventoryMovement | undefined = input.quantity > 0 ? { id: `movement-${crypto.randomUUID()}`, itemId: item.id, storeId: base.storeId, type: "IN", quantity: input.quantity, reason: "Estoque inicial da variante", createdAt: new Date().toISOString(), author, organizationId: item.organizationId } : undefined;
    await this.repository.createItem(item, initial);
    return item;
  }

  async update(item: InventoryItem, input: { name: string; code?: string; minimumQuantity: number; defaultPrice?: number; cost?: number; category: ProductCategory; brand?: string; material?: string; description?: string; variantAttributes?: Partial<ProductVariantAttributes> }): Promise<InventoryItem> {
    const name = input.name.trim();
    if (!name) throw new Error("Informe o nome do produto.");
    const category = categoryOf(input.category);
    if (!valid(input.minimumQuantity)) throw new Error("Informe um estoque mínimo válido.");
    const code = requiredCode(input.code);
    assertCodeIsUnique(await this.repository.listByStore(item.storeId), code, item.id);
    const updated: InventoryItem = { ...item, name, code, minimumQuantity: input.minimumQuantity, defaultPrice: optionalMoney(input.defaultPrice, "defaultPrice"), cost: optionalMoney(input.cost, "cost"), category, brand: optionalText(input.brand), material: optionalText(input.material), description: optionalText(input.description) };
    if (input.variantAttributes) {
      const attributes = normalizeVariantAttributes(category, input.variantAttributes);
      if (hasVariantAttributes(attributes)) updated.variantAttributes = attributes;
      else delete updated.variantAttributes;
    }
    await this.repository.updateItem(updated);
    return updated;
  }

  async adjust(item: InventoryItem, type: InventoryMovementType, quantity: number, reason: string, author?: string): Promise<InventoryItem> {
    const motive = reason.trim();
    if (!motive) throw new Error("Informe o motivo da movimentação.");
    if (!Number.isFinite(quantity) || quantity === 0) throw new Error("Informe uma quantidade válida.");
    if (type !== "ADJUSTMENT" && quantity < 0) throw new Error("Informe uma quantidade maior que zero.");
    if (item.quantity + movementDelta({ type, quantity }) < 0) throw new Error("Saldo insuficiente para esta movimentação.");
    if (item.quantity + movementDelta({ type, quantity }) < (item.reservedQuantity ?? 0)) throw new Error(`Saldo disponível insuficiente de "${item.name}" (reservado em orçamentos: ${item.reservedQuantity ?? 0}).`);
    const movement: InventoryMovement = { id: `movement-${crypto.randomUUID()}`, itemId: item.id, storeId: item.storeId, type, quantity, reason: motive, createdAt: new Date().toISOString(), author, organizationId: defaultOrganization.id };
    const updated = await this.repository.applyMovement(movement);
    await this.audit?.log({ storeId: item.storeId, action: "ADJUSTMENT", entity: "inventoryItem", entityId: item.id, author: author ?? "", reason: motive, summary: `${type} ${quantity} un. — ${item.name}` });
    return updated;
  }
}
