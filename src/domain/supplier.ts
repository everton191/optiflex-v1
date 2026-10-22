import { defaultOrganization } from "./access";
import { normalizeSearchText } from "./customer";
import { documentError, normalizeDocument } from "./field-rules";

export type SupplierKind = "SUPPLIER" | "LABORATORY";

export const supplierKinds: readonly SupplierKind[] = ["SUPPLIER", "LABORATORY"];

export const supplierKindLabels: Record<SupplierKind, string> = {
  SUPPLIER: "Fornecedor",
  LABORATORY: "Laboratório",
};

export function isSupplierKind(value: string): value is SupplierKind {
  return supplierKinds.includes(value as SupplierKind);
}

export interface Supplier {
  organizationId?: string;
  id: string;
  kind: SupplierKind;
  name: string;
  document?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierInput {
  kind: string;
  name: string;
  document?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertValidSupplierInput(input: SupplierInput): void {
  const name = input.name?.trim();
  if (!name) throw new Error("Informe o nome do fornecedor ou laboratório.");
  if (name.length > 120) throw new Error("Nome do fornecedor muito longo (máximo 120 caracteres).");
  if (!isSupplierKind(input.kind ?? "")) throw new Error("Tipo inválido: use Fornecedor ou Laboratório.");
  const document = input.document?.trim();
  if (document) {
    const problem = documentError(document);
    if (problem) throw new Error(`Documento do cadastro: ${problem}`);
  }
  const email = input.email?.trim();
  if (email && !emailPattern.test(email)) throw new Error("E-mail do cadastro inválido.");
}

export function defaultSupplier(input: SupplierInput): Supplier {
  return {
    id: `supplier-${crypto.randomUUID()}`,
    kind: input.kind as SupplierKind,
    name: input.name.trim(),
    document: input.document?.trim() || undefined,
    contactName: input.contactName?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    active: true,
    createdAt: new Date().toISOString(),
    organizationId: defaultOrganization.id,
  };
}

function compactSearch(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

export function supplierSearchTerms(supplier: Supplier): string[] {
  return [supplier.name, supplier.document, supplier.contactName, supplier.phone, supplier.email].filter(Boolean).map((value) => compactSearch(value!));
}

export function supplierMatchesQuery(supplier: Supplier, query: string): boolean {
  const needle = compactSearch(query);
  if (!needle) return true;
  return supplierSearchTerms(supplier).some((term) => term.includes(needle));
}

export function findDuplicateSupplier(suppliers: readonly Supplier[], input: Pick<SupplierInput, "name" | "document">, excludeId?: string): Supplier | undefined {
  const document = normalizeDocument(input.document ?? "");
  const name = normalizeSearchText(input.name ?? "");
  return suppliers.find((other) => other.id !== excludeId
    && ((Boolean(document) && normalizeDocument(other.document ?? "") === document)
      || (Boolean(name) && normalizeSearchText(other.name) === name)));
}

export function supplierListFilter(suppliers: readonly Supplier[], query: string, kind: string): Supplier[] {
  return suppliers.filter((supplier) => (!kind || supplier.kind === kind) && supplierMatchesQuery(supplier, query));
}
