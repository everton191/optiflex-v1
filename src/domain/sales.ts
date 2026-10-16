import type { InventoryMovement } from "./inventory";
import { fromCents, toCents } from "./money";
import { defaultOrganization } from "./access";
import { assertValidPrescriptionEye, assertValidPrescriptionMeasures, assertValidPrescriptionUsage, type Prescription, type PrescriptionEye, type PrescriptionMeasures, type PrescriptionUsage } from "./clinical";

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

// Copy of the structured prescription at quote time so the sale never asks the client to retype degrees.
export interface SalePrescription {
  prescriptionId: string;
  customerId: string;
  version: number;
  usage?: PrescriptionUsage;
  od: PrescriptionEye;
  oe: PrescriptionEye;
  measures?: PrescriptionMeasures;
  notes?: string;
}

export function salePrescriptionSnapshot(prescription: Prescription): SalePrescription {
  return { prescriptionId: prescription.id, customerId: prescription.customerId, version: prescription.version, usage: prescription.usage, od: prescription.od, oe: prescription.oe, measures: prescription.measures, notes: prescription.notes };
}

export function assertValidSalePrescription(prescription: SalePrescription): void {
  if (!prescription.prescriptionId?.trim()) throw new Error("Prescrição vinculada sem identificador.");
  if (!prescription.customerId?.trim()) throw new Error("Prescrição vinculada sem cliente.");
  if (!Number.isSafeInteger(prescription.version) || prescription.version < 1) throw new Error("Versão da prescrição vinculada inválida.");
  if (prescription.usage !== undefined) assertValidPrescriptionUsage(prescription.usage);
  assertValidPrescriptionEye(prescription.od);
  assertValidPrescriptionEye(prescription.oe);
  if (prescription.measures !== undefined) assertValidPrescriptionMeasures(prescription.measures);
  if (prescription.notes !== undefined && typeof prescription.notes !== "string") throw new Error("Observações da prescrição vinculada inválidas.");
}

export interface Sale {
  organizationId?: string;
  id: string;
  customerId: string;
  storeId: string;
  status: SaleStatus;
  quoteStatus?: QuoteStatus;
  paymentStatus?: SalePaymentStatus;
  description: string;
  total: number;
  items?: SaleItem[];
  prescription?: SalePrescription;
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
    organizationId: sale.organizationId ?? defaultOrganization.id,
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
    organizationId: sale.organizationId ?? defaultOrganization.id,
  }));
}
