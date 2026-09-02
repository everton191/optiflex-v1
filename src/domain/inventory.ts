export interface InventoryItem {
  id: string;
  storeId: string;
  name: string;
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
}
