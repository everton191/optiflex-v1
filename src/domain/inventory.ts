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
