import type { SupplierRepository } from "./repositories";
import { assertValidSupplierInput, defaultSupplier, findDuplicateSupplier, type Supplier, type SupplierInput } from "./supplier";

export class SupplierService {
  constructor(private readonly repository: SupplierRepository) {}

  list(): Promise<Supplier[]> { return this.repository.list(); }

  async create(input: SupplierInput): Promise<Supplier> {
    assertValidSupplierInput(input);
    const duplicate = findDuplicateSupplier(await this.repository.list(), input);
    if (duplicate) throw new Error(this.duplicateMessage(duplicate));
    return this.repository.create(defaultSupplier(input));
  }

  async update(supplier: Supplier, input: SupplierInput): Promise<Supplier> {
    assertValidSupplierInput(input);
    const duplicate = findDuplicateSupplier(await this.repository.list(), input, supplier.id);
    if (duplicate) throw new Error(this.duplicateMessage(duplicate));
    return this.repository.update({
      ...supplier,
      kind: input.kind as Supplier["kind"],
      name: input.name.trim(),
      document: input.document?.trim() || undefined,
      contactName: input.contactName?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  async setActive(supplier: Supplier, active: boolean): Promise<Supplier> {
    if (supplier.active === active) throw new Error(active ? "Este cadastro já está ativo." : "Este cadastro já está inativo.");
    return this.repository.update({ ...supplier, active, updatedAt: new Date().toISOString() });
  }

  private duplicateMessage(duplicate: Supplier): string {
    return `Já existe um cadastro com este nome ou documento: ${duplicate.name}${duplicate.active ? "" : " (inativo)"}${duplicate.kind === "LABORATORY" ? " · laboratório" : ""}.`;
  }
}
