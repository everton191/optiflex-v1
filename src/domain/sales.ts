import type { InventoryMovement, ProductCategory } from "./inventory";
import { isProductCategory } from "./inventory";
import { fromCents, toCents } from "./money";
import { defaultOrganization, type RoleKey } from "./access";
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
  category?: ProductCategory;
}

// Service line configured at sale time (e.g. coating, photochromic): no stock impact, priced per sale.
export interface SaleTreatment {
  name: string;
  price: number;
}

export function assertValidSaleTreatments(treatments: readonly SaleTreatment[]): void {
  for (const treatment of treatments) {
    if (typeof treatment.name !== "string" || !treatment.name.trim()) throw new Error("Tratamento sem nome.");
    if (typeof treatment.price !== "number" || !Number.isFinite(treatment.price) || treatment.price < 0) throw new Error("Preço do tratamento inválido.");
  }
}

export function treatmentsTotalCents(treatments: readonly SaleTreatment[]): number {
  return treatments.reduce((total, treatment) => total + toCents(treatment.price), 0);
}

export function assertValidSaleItems(items: readonly SaleItem[]): void {
  for (const item of items) {
    if (!item.name.trim() || !item.inventoryItemId.trim()) throw new Error("Informe o produto do estoque.");
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("Informe uma quantidade válida para cada item.");
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) throw new Error("Informe um preço válido para cada item.");
    if (item.category !== undefined && !isProductCategory(item.category)) throw new Error("Categoria do item inválida.");
  }
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
  treatments?: SaleTreatment[];
  prescription?: SalePrescription;
  discount?: SaleDiscount;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdAt: string;
}

export type SaleDiscountType = "PERCENT" | "AMOUNT";

export const saleDiscountTypeLabels: Record<SaleDiscountType, string> = { PERCENT: "Percentual", AMOUNT: "Valor" };
export const saleDiscountTypeKeys = Object.keys(saleDiscountTypeLabels) as SaleDiscountType[];

export interface SaleDiscountInput { type: SaleDiscountType; value: number; reason?: string }

// Immutable record of who applied the discount and (when above the applier's limit) who approved it.
export interface SaleDiscount extends SaleDiscountInput {
  grossTotal: number;
  appliedBy: string;
  appliedByRole: RoleKey;
  appliedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface DiscountAuthority { maxPercent: number; maxAmount: number }

// Defaults p/ v0.x (F3-12): vendedor/caixa 5% ou R$ 50; gerente 15% ou R$ 300; dono/rede 30% ou R$ 1000. Acima do topo, ninguém aprova.
export const discountAuthorityByRole: Partial<Record<RoleKey, DiscountAuthority>> = {
  SELLER: { maxPercent: 5, maxAmount: 50 },
  CASHIER: { maxPercent: 5, maxAmount: 50 },
  STORE_MANAGER: { maxPercent: 15, maxAmount: 300 },
  NETWORK_ADMINISTRATOR: { maxPercent: 30, maxAmount: 1000 },
  OWNER: { maxPercent: 30, maxAmount: 1000 }
};

export function isSaleDiscountType(value: string): value is SaleDiscountType {
  return value === "PERCENT" || value === "AMOUNT";
}

export function assertValidSaleDiscount(input: SaleDiscountInput): void {
  if (!isSaleDiscountType(input.type)) throw new Error("Tipo de desconto inválido.");
  if (!Number.isFinite(input.value) || input.value <= 0) throw new Error("Informe um desconto maior que zero.");
  if (input.type === "PERCENT" && input.value > 100) throw new Error("Desconto percentual não pode passar de 100%.");
  if (input.reason !== undefined && typeof input.reason !== "string") throw new Error("Motivo do desconto inválido.");
}

export function saleDiscountAmountCents(grossTotal: number, discount: Pick<SaleDiscount, "type" | "value">): number {
  const grossCents = toCents(grossTotal);
  const amount = discount.type === "PERCENT" ? Math.round(grossCents * discount.value / 100) : toCents(discount.value);
  return Math.max(0, Math.min(amount, grossCents));
}

export function saleTotalWithDiscount(grossTotal: number, discount?: Pick<SaleDiscount, "type" | "value">): number {
  if (!discount) return grossTotal;
  return fromCents(toCents(grossTotal) - saleDiscountAmountCents(grossTotal, discount));
}

export function discountWithinAuthority(grossTotal: number, discount: Pick<SaleDiscount, "type" | "value">, role: RoleKey): boolean {
  const authority = discountAuthorityByRole[role];
  if (!authority) return false;
  const grossCents = toCents(grossTotal);
  if (grossCents <= 0) return false;
  const amount = saleDiscountAmountCents(grossTotal, discount);
  const percent = amount * 100 / grossCents;
  return percent <= authority.maxPercent + 0.0001 && amount <= toCents(authority.maxAmount);
}

export function discountRequiresApproval(grossTotal: number, discount: Pick<SaleDiscount, "type" | "value">, applierRole: RoleKey): boolean {
  return !discountWithinAuthority(grossTotal, discount, applierRole);
}

export function canApproveDiscount(grossTotal: number, discount: Pick<SaleDiscount, "type" | "value">, approverRole: RoleKey): boolean {
  return discountWithinAuthority(grossTotal, discount, approverRole);
}

export function assertDiscountNotZeroing(grossTotal: number, discount: Pick<SaleDiscount, "type" | "value">): void {
  if (saleDiscountAmountCents(grossTotal, discount) >= toCents(grossTotal)) throw new Error("O desconto não pode zerar o total da venda.");
}

// Sale.total is the net amount (after discount); the pre-discount base lives on the discount record.
export function saleGrossTotal(sale: Pick<Sale, "total" | "discount">): number {
  return sale.discount ? sale.discount.grossTotal : sale.total;
}

export function saleDiscountAmount(sale: Pick<Sale, "total" | "discount">): number {
  if (!sale.discount) return 0;
  return fromCents(saleDiscountAmountCents(sale.discount.grossTotal, sale.discount));
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

export function quoteReservationDeltas(previous: readonly SaleItem[] | undefined, next: readonly SaleItem[] | undefined): Map<string, number> {
  const deltas = new Map<string, number>();
  for (const item of previous ?? []) deltas.set(item.inventoryItemId, (deltas.get(item.inventoryItemId) ?? 0) - item.quantity);
  for (const item of next ?? []) deltas.set(item.inventoryItemId, (deltas.get(item.inventoryItemId) ?? 0) + item.quantity);
  for (const [id, value] of [...deltas]) if (value === 0) deltas.delete(id);
  return deltas;
}
