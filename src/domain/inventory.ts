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
  fiscal?: ProductFiscalFields;
}

export const fiscalUnits = ["UN", "CX", "KG", "M", "PAR", "KIT"] as const;
export type FiscalUnit = (typeof fiscalUnits)[number];
export const fiscalUnitLabels: Record<FiscalUnit, string> = { UN: "Unidade (UN)", CX: "Caixa (CX)", KG: "Quilo (KG)", M: "Metro (M)", PAR: "Par (PAR)", KIT: "Kit (KIT)" };

export function isFiscalUnit(value: unknown): value is FiscalUnit {
  return typeof value === "string" && (fiscalUnits as readonly string[]).includes(value);
}

export interface ProductFiscalFields {
  ncm?: string;
  cfop?: string;
  cest?: string;
  unit?: FiscalUnit;
}

export interface ProductFiscalInput {
  ncm?: string;
  cfop?: string;
  cest?: string;
  unit?: string;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatNcm(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 6 ? `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}` : digits.length > 4 ? `${digits.slice(0, 4)}.${digits.slice(4)}` : digits;
}

export function formatCest(value: string): string {
  const digits = onlyDigits(value).slice(0, 7);
  return digits.length > 5 ? `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}` : digits.length > 2 ? `${digits.slice(0, 2)}.${digits.slice(2)}` : digits;
}

export function normalizeProductFiscal(input: ProductFiscalInput): ProductFiscalFields {
  const ncm = onlyDigits(input.ncm?.trim() ?? "");
  const cfop = onlyDigits(input.cfop?.trim() ?? "");
  const cest = onlyDigits(input.cest?.trim() ?? "");
  const unit = input.unit?.trim();
  if (ncm && ncm.length !== 8) throw new Error("NCM deve ter 8 dígitos.");
  if (cfop && cfop.length !== 4) throw new Error("CFOP deve ter 4 dígitos.");
  if (cest && cest.length !== 7) throw new Error("CEST deve ter 7 dígitos.");
  if (unit && !isFiscalUnit(unit)) throw new Error("Selecione uma unidade fiscal válida.");
  const fiscal: ProductFiscalFields = {};
  if (ncm) fiscal.ncm = ncm;
  if (cfop) fiscal.cfop = cfop;
  if (cest) fiscal.cest = cest;
  if (unit) fiscal.unit = unit as FiscalUnit;
  return fiscal;
}

export function hasProductFiscal(fiscal: ProductFiscalFields | undefined): fiscal is ProductFiscalFields {
  return Boolean(fiscal && (fiscal.ncm || fiscal.cfop || fiscal.cest || fiscal.unit));
}

export function fiscalSummary(fiscal: ProductFiscalFields | undefined): string {
  if (!fiscal) return "";
  const parts: string[] = [];
  if (fiscal.ncm) parts.push(`NCM ${formatNcm(fiscal.ncm)}`);
  if (fiscal.cfop) parts.push(`CFOP ${fiscal.cfop}`);
  if (fiscal.cest) parts.push(`CEST ${formatCest(fiscal.cest)}`);
  if (fiscal.unit) parts.push(fiscalUnitLabels[fiscal.unit]);
  return parts.join(" · ");
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

export interface ProductLabelLine { label?: string; value: string; strong?: boolean }

export function productLabelLines(item: InventoryItem): ProductLabelLine[] {
  const lines: ProductLabelLine[] = [{ value: item.name, strong: true }];
  const sheet = [item.brand, item.material].filter((part): part is string => Boolean(part?.trim())).join(" · ");
  if (sheet) lines.push({ value: sheet });
  if (item.category) lines.push({ label: "Categoria", value: productCategoryLabels[item.category] });
  const variant = variantSummary(item.variantAttributes);
  if (variant) lines.push({ value: variant });
  lines.push({ label: "Código", value: item.code?.trim() || "—", strong: true });
  if (item.defaultPrice !== undefined) lines.push({ label: "Preço", value: `R$ ${item.defaultPrice.toFixed(2)}` });
  lines.push({ label: "Saldo", value: String(item.quantity) });
  return lines;
}
