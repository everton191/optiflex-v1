import { toCents } from "./money";

export const productCategories = ["FRAME", "LENS", "ACCESSORY"] as const;
export type ProductCategory = (typeof productCategories)[number];
export const productCategoryLabels: Record<ProductCategory, string> = { FRAME: "Armação", LENS: "Lente", ACCESSORY: "Acesso" };
export type ProductCategoryFilter = "ALL" | ProductCategory;

export function isProductCategory(value: unknown): value is ProductCategory {
  return typeof value === "string" && (productCategories as readonly string[]).includes(value);
}

export interface InventoryItem {
  organizationId?: string;
  id: string;
  storeId: string;
  name: string;
  code?: string;
  quantity: number;
  reservedQuantity?: number;
  minimumQuantity: number;
  defaultPrice?: number;
  cost?: number;
  category?: ProductCategory;
  brand?: string;
  material?: string;
  description?: string;
  variantAttributes?: ProductVariantAttributes;
}

export type VariantField = "color" | "size" | "material" | "lensIndex" | "treatment";

export const variantFieldLabels: Record<VariantField, string> = { color: "Cor", size: "Tamanho", material: "Material", lensIndex: "Índice", treatment: "Tratamento" };

export const variantFieldsByCategory: Record<ProductCategory, readonly VariantField[]> = {
  FRAME: ["color", "size", "material"],
  LENS: ["lensIndex", "treatment"],
  ACCESSORY: ["color", "material"]
};

export interface ProductVariantAttributes {
  color?: string;
  size?: string;
  material?: string;
  lensIndex?: string;
  treatment?: string;
}

export function normalizeVariantAttributes(category: ProductCategory, input: Partial<ProductVariantAttributes>): ProductVariantAttributes {
  const allowed = variantFieldsByCategory[category] ?? [];
  const normalized: ProductVariantAttributes = {};
  for (const field of allowed) {
    const value = input[field]?.trim();
    if (value) normalized[field] = value;
  }
  return normalized;
}

export function hasVariantAttributes(attributes: ProductVariantAttributes | undefined): attributes is ProductVariantAttributes {
  return Boolean(attributes && Object.values(attributes).some((value) => Boolean(value?.trim())));
}

export function variantSummary(attributes: ProductVariantAttributes | undefined): string {
  if (!attributes) return "";
  return (Object.keys(variantFieldLabels) as VariantField[]).flatMap((field) => { const value = attributes[field]?.trim(); return value ? [`${variantFieldLabels[field]} ${value}`] : []; }).join(" · ");
}

export function buildVariantName(baseName: string, attributes: ProductVariantAttributes): string {
  const summary = variantSummary(attributes);
  return summary ? `${baseName.trim()} · ${summary}` : baseName.trim();
}

export function variantCodeSuffix(attributes: ProductVariantAttributes): string {
  return (Object.keys(variantFieldLabels) as VariantField[]).flatMap((field) => { const value = attributes[field]?.trim(); return value ? [value.toUpperCase().replace(/[^A-ZÀ-Ú0-9]+/g, "-")] : []; }).join("-");
}

export function filterByVariantField(items: readonly InventoryItem[], field: VariantField, value: string): InventoryItem[] {
  const needle = value.trim().toLowerCase();
  return items.filter((item) => item.variantAttributes?.[field]?.trim().toLowerCase() === needle);
}

export function variantFieldOptions(items: readonly InventoryItem[], field: VariantField): string[] {
  const values = new Set<string>();
  for (const item of items) {
    const value = item.variantAttributes?.[field]?.trim();
    if (value) values.add(value);
  }
  return [...values].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function filterByCategory(items: readonly InventoryItem[], filter: ProductCategoryFilter): InventoryItem[] {
  if (filter === "ALL") return [...items];
  return items.filter((item) => item.category === filter);
}

export type InventoryMovementType = "IN" | "OUT" | "ADJUSTMENT";

export interface InventoryMovement {
  organizationId?: string;
  id: string;
  itemId: string;
  storeId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
  createdAt: string;
  author?: string;
}

export type StockState = "OUT" | "LOW" | "OK";

export function availableQuantity(item: Pick<InventoryItem, "quantity" | "reservedQuantity">): number {
  return item.quantity - (item.reservedQuantity ?? 0);
}

export function stockState(item: Pick<InventoryItem, "quantity" | "minimumQuantity">): StockState {
  if (!Number.isFinite(item.quantity) || item.quantity <= 0) return "OUT";
  if (Number.isFinite(item.minimumQuantity) && item.minimumQuantity > 0 && item.quantity <= item.minimumQuantity) return "LOW";
  return "OK";
}

export function movementDelta(movement: Pick<InventoryMovement, "type" | "quantity">): number {
  return movement.type === "OUT" ? -movement.quantity : movement.quantity;
}

export function marginCents(defaultPrice: number, cost: number): number | undefined {
  if (!Number.isFinite(defaultPrice) || !Number.isFinite(cost)) return undefined;
  return toCents(defaultPrice) - toCents(cost);
}
