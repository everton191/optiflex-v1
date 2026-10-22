import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { SupplierService } from "../../domain/supplier-service";
import { database } from "./database";
import { LocalSupplierRepository } from "./local-repositories";

const service = new SupplierService(new LocalSupplierRepository());

afterEach(async () => { await database.delete(); });

describe("supplier storage", () => {
  it("creates, lists by name, updates and toggles suppliers in IndexedDB", async () => {
    await database.open();
    const created = await service.create({ kind: "SUPPLIER", name: "Óptica São João", document: "529.982.247-25", contactName: "Ana Souza", phone: "11 98888-7777" });
    expect(created.id).toMatch(/^supplier-/);
    expect(created.organizationId).toBe("org-local");
    await service.create({ kind: "LABORATORY", name: "Laboratório Vista Clara" });
    expect((await service.list()).map((row) => row.name)).toEqual(["Laboratório Vista Clara", "Óptica São João"]);
    const updated = await service.update(created, { kind: "SUPPLIER", name: "Óptica São João Centro", document: "529.982.247-25", contactName: "Ana Souza" });
    expect(updated).toMatchObject({ id: created.id, createdAt: created.createdAt, name: "Óptica São João Centro" });
    await service.setActive(updated, false);
    expect((await service.list()).find((row) => row.id === updated.id)).toMatchObject({ active: false });
  });

  it("rejects duplicates against persisted rows and keeps data after reopening", async () => {
    await database.open();
    await service.create({ kind: "SUPPLIER", name: "Fornecedor Alfa", document: "11.222.333/0001-81" });
    await expect(service.create({ kind: "LABORATORY", name: "Outro", document: "11.222.333/0001-81" })).rejects.toThrow("Já existe um cadastro");
    database.close();
    await database.open();
    expect(await service.list()).toHaveLength(1);
  });

  it("reports a missing record on update instead of inserting silently", async () => {
    await database.open();
    const created = await service.create({ kind: "SUPPLIER", name: "Fornecedor Único" });
    await database.suppliers.delete(created.id);
    await expect(service.setActive(created, false)).rejects.toThrow("Cadastro de fornecedor não encontrado.");
  });
});
