import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { InventoryService } from "../../domain/inventory-service";
import type { InventoryItem } from "../../domain/inventory";
import { database } from "./database";
import { LocalInventoryRepository } from "./local-repositories";

const repository = new LocalInventoryRepository();
const service = new InventoryService(repository);
const seeded: InventoryItem = { id: "item-seeded", storeId: "store-centro", name: "Armação", code: "AR-1", quantity: 10, minimumQuantity: 4 };

afterEach(async () => { await database.delete(); });

describe("inventory storage", () => {
  it("persists the product and its initial movement across reopen", async () => {
    await database.open();
    const created = await service.create("store-centro", { name: "Lente 1.67", code: "LT-167", quantity: 8, minimumQuantity: 2 }, "Operador");
    const history = await service.history("store-centro");
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ itemId: created.id, type: "IN", quantity: 8, reason: "Estoque inicial", author: "Operador" });
    database.close();
    await database.open();
    expect(await service.list("store-centro")).toHaveLength(1);
    expect(await service.history("store-centro")).toHaveLength(1);
  });

  it("applies a movement and refuses to leave a negative balance", async () => {
    await database.open();
    await service.create("store-centro", { name: "Armação", quantity: 10, minimumQuantity: 4 });
    const [stored] = await service.list("store-centro");
    const afterOut = await service.adjust(stored, "OUT", 4, "Venda", "Operador");
    expect(afterOut.quantity).toBe(6);
    await expect(service.adjust(afterOut, "OUT", 7, "Venda")).rejects.toThrow("Saldo insuficiente");
    expect((await service.list("store-centro"))[0].quantity).toBe(6);
    expect(await service.history("store-centro")).toHaveLength(2);
  });

  it("keeps concurrent outgoing movements atomic", async () => {
    await database.open();
    await service.create("store-centro", { name: "Armação", quantity: 10, minimumQuantity: 0 });
    const [stored] = await service.list("store-centro");
    const results = await Promise.allSettled([
      service.adjust(stored, "OUT", 6, "Venda A"),
      service.adjust(stored, "OUT", 6, "Venda B"),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await service.list("store-centro"))[0].quantity).toBe(4);
    expect(await service.history("store-centro")).toHaveLength(2);
  });

  it("isolates products and movements by store", async () => {
    await database.open();
    const created = await service.create("store-centro", { name: "Armação", quantity: 5, minimumQuantity: 1 });
    expect(await service.list("store-shopping")).toHaveLength(0);
    expect(await service.history("store-shopping")).toHaveLength(0);
    await expect(service.adjust({ ...created, storeId: "store-shopping" }, "OUT", 1, "Venda")).rejects.toThrow("não encontrado");
    await expect(repository.updateItem({ ...created, storeId: "store-shopping" })).rejects.toThrow("não encontrado");
    expect((await service.list("store-centro"))[0].quantity).toBe(5);
  });

  it("edits product data without touching the persisted balance", async () => {
    await database.open();
    const created = await service.create("store-centro", { name: "Armação", quantity: 5, minimumQuantity: 1 });
    const updated = await service.update({ ...created, quantity: 999 }, { name: "  Armação nova  ", code: " AR-1 ", minimumQuantity: 6 });
    expect(updated).toMatchObject({ name: "Armação nova", code: "AR-1", minimumQuantity: 6, quantity: 999 });
    const [stored] = await service.list("store-centro");
    expect(stored).toMatchObject({ name: "Armação nova", quantity: 5, minimumQuantity: 6 });
  });

  it("registers a signed adjustment from an inventory count", async () => {
    await database.open();
    await service.create("store-centro", { name: "Armação", quantity: 5, minimumQuantity: 1 });
    const [stored] = await service.list("store-centro");
    const adjusted = await service.adjust(stored, "ADJUSTMENT", -2, "Conferência", "Operador");
    expect(adjusted.quantity).toBe(3);
    const movements = await service.history("store-centro");
    expect(movements.find((movement) => movement.type === "ADJUSTMENT")).toMatchObject({ quantity: -2, reason: "Conferência", author: "Operador" });
  });

  it("rejects a duplicated product id", async () => {
    await database.open();
    await repository.createItem(seeded);
    await expect(repository.createItem(seeded)).rejects.toThrow();
  });
});
