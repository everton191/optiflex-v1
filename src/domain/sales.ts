import type { InventoryMovement } from "./inventory";
import { fromCents, toCents } from "./money";

export type SaleStatus = "QUOTE" | "CONFIRMED" | "CANCELLED";
export type SalePaymentStatus = "PENDING" | "PAID";

export interface SaleItem {
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  customerId: string;
  storeId: string;
  status: SaleStatus;
  paymentStatus?: SalePaymentStatus;
  description: string;
  total: number;
  items?: SaleItem[];
  createdAt: string;
}

export function itemsTotalCents(items: readonly SaleItem[]): number {
  return items.reduce((total, item) => total + toCents(item.quantity * item.unitPrice), 0);
}

export function itemsTotal(items: readonly SaleItem[]): number {
  return fromCents(itemsTotalCents(items));
}

export function stockMovementsFor(sale: Sale): InventoryMovement[] {
  return (sale.items ?? []).map((item) => ({
    id: `movement-${crypto.randomUUID()}`,
    itemId: item.inventoryItemId,
    storeId: sale.storeId,
    type: "OUT" as const,
    quantity: item.quantity,
    reason: `Venda: ${sale.description}`,
    createdAt: new Date().toISOString(),
  }));
}
