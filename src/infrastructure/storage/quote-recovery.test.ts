import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { SalesService } from "../../domain/sales-service";
import type { InventoryRepository } from "../../domain/repositories";
import { database } from "./database";
import { LocalSaleRepository } from "./local-repositories";

const inventoryStub: InventoryRepository = {
  listByStore: async () => [],
  listMovements: async () => [],
  createItem: async () => {},
  updateItem: async () => {},
  applyMovement: async () => { throw new Error("unused"); },
  applyReservation: async (itemId, storeId) => ({ id: itemId, storeId, name: "Produto", quantity: 99, minimumQuantity: 0 })
};
const salesService = new SalesService(new LocalSaleRepository(), undefined, undefined, inventoryStub);
afterEach(async () => { await database.delete(); });

describe("quote recovery after days", () => {
  it("keeps items, prices, total and negotiation state of an old quote after reopening the database", async () => {
    await database.open();
    await database.customers.add({ id: "customer-1", name: "Cliente", createdAt: "2026-01-01T09:00:00.000Z" });
    const created = await salesService.createQuote("customer-1", "store-centro", "", 0, [
      { inventoryItemId: "item-1", name: "Armação", quantity: 2, unitPrice: 150.5 },
      { inventoryItemId: "item-2", name: "Lente", quantity: 2, unitPrice: 90 }
    ]);
    const sent = await salesService.transitionQuote(created, "SENT");
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    await new LocalSaleRepository().save({ ...sent, createdAt: threeDaysAgo });
    database.close();
    await database.open();
    const [recovered] = await salesService.list("store-centro");
    expect(recovered).toMatchObject({
      id: created.id,
      createdAt: threeDaysAgo,
      status: "QUOTE",
      quoteStatus: "SENT",
      total: 481,
      items: [
        { inventoryItemId: "item-1", name: "Armação", quantity: 2, unitPrice: 150.5 },
        { inventoryItemId: "item-2", name: "Lente", quantity: 2, unitPrice: 90 }
      ]
    });
  });
});
