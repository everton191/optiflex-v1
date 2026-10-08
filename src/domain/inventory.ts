export interface InventoryItem {
  id: string;
  storeId: string;
  name: string;
  code?: string;
  quantity: number;
  minimumQuantity: number;
}

export type InventoryMovementType = "IN" | "OUT" | "ADJUSTMENT";

export interface InventoryMovement {
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

export function stockState(item: Pick<InventoryItem, "quantity" | "minimumQuantity">): StockState {
  if (!Number.isFinite(item.quantity) || item.quantity <= 0) return "OUT";
  if (Number.isFinite(item.minimumQuantity) && item.minimumQuantity > 0 && item.quantity <= item.minimumQuantity) return "LOW";
  return "OK";
}

export function movementDelta(movement: Pick<InventoryMovement, "type" | "quantity">): number {
  return movement.type === "OUT" ? -movement.quantity : movement.quantity;
}
