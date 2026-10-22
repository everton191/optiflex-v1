import { describe, expect, it } from "vitest";
import type { SupplierRepository } from "./repositories";
import { SupplierService } from "./supplier-service";
import { assertValidSupplierInput, defaultSupplier, findDuplicateSupplier, isSupplierKind, supplierKindLabels, supplierListFilter, type Supplier, type SupplierInput } from "./supplier";

class InMemorySupplierRepository implements SupplierRepository {
  readonly rows: Supplier[] = [];
  async list(): Promise<Supplier[]> { return [...this.rows]; }
  async create(supplier: Supplier): Promise<Supplier> { this.rows.push(supplier); return supplier; }
  async update(supplier: Supplier): Promise<Supplier> {
    const index = this.rows.findIndex((row) => row.id === supplier.id);
    if (index < 0) throw new Error("Cadastro de fornecedor não encontrado.");
    this.rows[index] = supplier;
    return supplier;
  }
}

const validInput: SupplierInput = { kind: "SUPPLIER", name: "Óptica São João", document: "529.982.247-25" };
const laboratory: SupplierInput = { kind: "LABORATORY", name: "Laboratório Vista Clara" };

describe("supplier registration rules", () => {
  it("creates a default supplier with identity, organization stamp and trimmed fields", () => {
    const supplier = defaultSupplier({ ...validInput, name: "  Óptica São João  ", document: "", contactName: "  Maria  ", email: "" });
    expect(supplier.id).toMatch(/^supplier-/);
    expect(supplier.active).toBe(true);
    expect(supplier.organizationId).toBe("org-local");
    expect(supplier.name).toBe("Óptica São João");
    expect(supplier.document).toBeUndefined();
    expect(supplier.contactName).toBe("Maria");
    expect(supplier.email).toBeUndefined();
    expect(Number.isFinite(Date.parse(supplier.createdAt))).toBe(true);
  });
  it("rejects blank or oversized names, unknown kinds, broken documents and malformed e-mail", () => {
    expect(() => assertValidSupplierInput({ ...validInput, name: "   " })).toThrow("Informe o nome");
    expect(() => assertValidSupplierInput({ ...validInput, name: "x".repeat(121) })).toThrow("muito longo");
    expect(() => assertValidSupplierInput({ ...validInput, kind: "DESPACHANTE" })).toThrow("Tipo inválido");
    expect(() => assertValidSupplierInput({ ...validInput, document: "111.111.111-11" })).toThrow("Documento do cadastro: CPF ou CNPJ inválido.");
    expect(() => assertValidSupplierInput({ ...validInput, document: "123" })).toThrow("Documento do cadastro: CPF ou CNPJ inválido.");
    expect(() => assertValidSupplierInput({ ...validInput, email: "maria@" })).toThrow("E-mail do cadastro inválido.");
    expect(() => assertValidSupplierInput({ ...validInput, document: "11.222.333/0001-81", email: "contato@optica.com.br" })).not.toThrow();
    expect(isSupplierKind("SUPPLIER") && isSupplierKind("LABORATORY")).toBe(true);
    expect(isSupplierKind("CUSTOMER")).toBe(false);
    expect(supplierKindLabels.LABORATORY).toBe("Laboratório");
  });
  it("finds duplicates by document digits or normalized name, honoring the exclusion id", () => {
    const existing: Supplier[] = [{ ...defaultSupplier(validInput), id: "supplier-1", name: "Laboratório Vista Clara", document: "11.222.333/0001-81" }];
    expect(findDuplicateSupplier(existing, { name: "Outro nome", document: "11222333000181" })?.id).toBe("supplier-1");
    expect(findDuplicateSupplier(existing, { name: "  laboratório vista clara! " })?.id).toBe("supplier-1");
    expect(findDuplicateSupplier(existing, { name: "Laboratório Vista Clara" }, "supplier-1")).toBeUndefined();
    expect(findDuplicateSupplier(existing, { name: "Fornecedor diverso" })).toBeUndefined();
  });
  it("filters the list by free text across name, document, contact and phone plus kind", () => {
    const suppliers: Supplier[] = [
      { ...defaultSupplier(validInput), name: "Óptica São João", document: "529.982.247-25", contactName: "Ana Souza", phone: "11 98888-7777" },
      { ...defaultSupplier(laboratory), name: "Laboratório Vista Clara", kind: "LABORATORY" },
    ];
    expect(supplierListFilter(suppliers, "", "").map((row) => row.name)).toEqual(["Óptica São João", "Laboratório Vista Clara"]);
    expect(supplierListFilter(suppliers, "98888", "")).toHaveLength(1);
    expect(supplierListFilter(suppliers, "52998224725", "")).toHaveLength(1);
    expect(supplierListFilter(suppliers, "ana", "")).toHaveLength(1);
    expect(supplierListFilter(suppliers, "", "LABORATORY").map((row) => row.name)).toEqual(["Laboratório Vista Clara"]);
    expect(supplierListFilter(suppliers, "inexistente", "")).toHaveLength(0);
  });
});

describe("supplier service workflow", () => {
  it("creates, lists, updates and toggles status through the repository", async () => {
    const repository = new InMemorySupplierRepository();
    const service = new SupplierService(repository);
    const created = await service.create(validInput);
    expect(created.active).toBe(true);
    expect((await service.list()).map((row) => row.name)).toEqual(["Óptica São João"]);
    const renamed = await service.update(created, { ...validInput, name: "Óptica São João Centro", contactName: "Ana" });
    expect(renamed.id).toBe(created.id);
    expect(renamed.contactName).toBe("Ana");
    const inactive = await service.setActive(renamed, false);
    expect(inactive.active).toBe(false);
    expect(inactive.updatedAt).toBeTruthy();
    await expect(service.setActive(inactive, false)).rejects.toThrow("já está inativo");
    await expect(service.setActive(inactive, true)).resolves.toMatchObject({ active: true });
  });
  it("blocks duplicate name or document across active and inactive registrations", async () => {
    const repository = new InMemorySupplierRepository();
    const service = new SupplierService(repository);
    const first = await service.create({ kind: "SUPPLIER", name: "Fornecedor Alfa", document: "11.222.333/0001-81" });
    await expect(service.create({ kind: "SUPPLIER", name: "Fornecedor Alfa Ltda" })).resolves.toMatchObject({ name: "Fornecedor Alfa Ltda" });
    await expect(service.create({ kind: "LABORATORY", name: "Laboratório Beta", document: "11222333000181" })).rejects.toThrow("Já existe um cadastro");
    await service.setActive(first, false);
    await expect(service.create({ kind: "SUPPLIER", name: "Fornecedor Alfa" })).rejects.toThrow("(inativo)");
    const self = await service.update(first, { kind: "SUPPLIER", name: "Fornecedor Alfa", document: "11.222.333/0001-81" });
    expect(self.name).toBe("Fornecedor Alfa");
    await service.create({ kind: "SUPPLIER", name: "Fornecedor Gama" });
    await expect(service.create({ kind: "SUPPLIER", name: "  fornecedor alfa " })).rejects.toThrow("Já existe um cadastro");
  });
});
