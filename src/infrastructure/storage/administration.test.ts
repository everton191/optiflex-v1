import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { AdministrationService } from "../../domain/administration-service";
import { database } from "./database";
import { LocalAdministrationRepository } from "./local-repositories";

const repository = new LocalAdministrationRepository();
const service = new AdministrationService(repository);

afterEach(async () => { await database.delete(); });

describe("store administration storage", () => {
  it("keeps a new branch after reopen so the selector can list it", async () => {
    await database.open();
    await service.initialize();
    await service.createStore({ name: "Loja Norte" });
    database.close();
    await database.open();
    const stores = await service.listStores();
    expect(stores.map((store) => store.name)).toContain("Loja Norte");
    expect(stores.find((store) => store.name === "Loja Norte")).toMatchObject({ active: true });
  });

  it("inactivates a branch without deleting its record and can reactivate it", async () => {
    await database.open();
    await service.initialize();
    await service.createStore({ name: "Loja Sul" });
    const stores = await service.listStores();
    const sul = stores.find((store) => store.name === "Loja Sul");
    expect(sul).toBeDefined();
    await service.setStoreActive(sul!.id, false);
    database.close();
    await database.open();
    const reopened = await service.listStores();
    expect(reopened).toHaveLength(stores.length);
    expect(reopened.find((store) => store.id === sul!.id)).toMatchObject({ name: "Loja Sul", active: false });
    expect(reopened.find((store) => store.id === "store-centro")).toMatchObject({ active: true });
    await expect(service.selectStore(sul!.id)).rejects.toThrow("Loja inválida ou inativa.");
    await service.setStoreActive(sul!.id, true);
    expect((await service.listStores()).find((store) => store.id === sul!.id)).toMatchObject({ active: true });
    await service.selectStore(sul!.id);
    expect((await service.currentStore()).storeId).toBe(sul!.id);
  });

  it("renames a branch while keeping the same record", async () => {
    await database.open();
    await service.initialize();
    const created = await service.createStore({ name: "Loja Antiga" });
    await service.updateStore(created.id, { name: "Loja Nova" });
    database.close();
    await database.open();
    const stores = await service.listStores();
    expect(stores.filter((store) => store.id === created.id)).toHaveLength(1);
    expect(stores.find((store) => store.id === created.id)).toMatchObject({ name: "Loja Nova", active: true });
  });
});
