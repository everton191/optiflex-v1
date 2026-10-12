import type { InventoryMovement } from "./inventory";
import { fromCents, toCents } from "./money";

export type SaleStatus = "QUOTE" | "CONFIRMED" | "CANCELLED";
export type SalePaymentStatus = "PENDING" | "PARTIAL" | "PAID";
export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export const quoteStatusLabels: Record<QuoteStatus, string> = { DRAFT: "Rascunho", SENT: "Enviado", ACCEPTED: "Aceito", REJECTED: "Recusado", EXPIRED: "Expirado" };

export const quoteTransitions: Record<QuoteStatus, readonly QuoteStatus[]> = {
  DRAFT: ["SENT", "ACCEPTED", "REJECTED"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: []
};

export function quoteStatusOf(sale: Pick<Sale, "quoteStatus">): QuoteStatus {
  return sale.quoteStatus ?? "DRAFT";
}

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
  quoteStatus?: QuoteStatus;
  paymentStatus?: SalePaymentStatus;
  description: string;
  total: number;
  items?: SaleItem[];
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
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

export function refundStockMovementsFor(sale: Sale): InventoryMovement[] {
  return (sale.items ?? []).map((item) => ({
    id: `movement-${crypto.randomUUID()}`,
    itemId: item.inventoryItemId,
    storeId: sale.storeId,
    type: "IN" as const,
    quantity: item.quantity,
    reason: `Estorno: ${sale.description}`,
    createdAt: new Date().toISOString(),
  }));
}
