import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { SaleItem } from "../../domain/sales";
import { InventoryService } from "../../domain/inventory-service";
import { SalesService } from "../../domain/sales-service";
import { database } from "./database";
import { LocalInventoryRepository, LocalSaleRepository } from "./local-repositories";

const salesService = new SalesService(new LocalSaleRepository());
const inventoryService = new InventoryService(new LocalInventoryRepository());
const saleItem = (product: { id: string; name: string }, quantity: number): SaleItem => ({ inventoryItemId: product.id, name: product.name, quantity, unitPrice: 120 });

afterEach(async () => { await database.delete(); });

async function seed(productQuantity: number, itemQuantity = 1) {
  await database.customers.add({ id: "customer-1", name: "Cliente", createdAt: "2026-01-01T09:00:00.000Z" });
  const product = await inventoryService.create("store-centro", { name: "Lente", quantity: productQuantity, minimumQuantity: 0 }, "Operador");
  const sale = await salesService.createQuote("customer-1", "store-centro", "Venda com item", 0, [saleItem(product, itemQuantity)]);
  return { product, sale };
}

describe("sale confirmation deducts stock atomically", () => {
  it("deducts the balance, records the movement and keeps both after reopen", async () => {
    await database.open();
    const { product, sale } = await seed(5);
    const confirmed = await salesService.confirm(sale);
    expect(confirmed.status).toBe("CONFIRMED");
    expect((await inventoryService.list("store-centro"))[0].quantity).toBe(4);
    const movements = await inventoryService.history("store-centro");
    expect(movements).toHaveLength(2);
    const outgoing = movements.find((movement) => movement.type === "OUT");
    expect(outgoing).toMatchObject({ itemId: product.id, type: "OUT", quantity: 1, reason: "Venda: Venda com item" });
    expect(outgoing?.author).toBeUndefined();
    database.close();
    await database.open();
    expect((await salesService.list("store-centro"))[0]).toMatchObject({ status: "CONFIRMED" });
    expect((await inventoryService.list("store-centro"))[0].quantity).toBe(4);
  });

  it("rolls back the sale when the balance is not enough", async () => {
    await database.open();
    const { sale } = await seed(1, 2);
    await expect(salesService.confirm(sale)).rejects.toThrow("Saldo insuficiente");
    expect((await salesService.list("store-centro"))[0].status).toBe("QUOTE");
    expect((await inventoryService.list("store-centro"))[0].quantity).toBe(1);
    expect(await inventoryService.history("store-centro")).toHaveLength(1);
  });

  it("lets only one of two concurrent confirmations take the last unit", async () => {
    await database.open();
    await database.customers.add({ id: "customer-1", name: "Cliente", createdAt: "2026-01-01T09:00:00.000Z" });
    const product = await inventoryService.create("store-centro", { name: "Lente", quantity: 1, minimumQuantity: 0 });
    const quoteOf = () => salesService.createQuote("customer-1", "store-centro", "Venda", 0, [saleItem(product, 1)]);
    const [first, second] = await Promise.all([quoteOf(), quoteOf()]);
    const results = await Promise.allSettled([salesService.confirm(first), salesService.confirm(second)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await inventoryService.list("store-centro"))[0].quantity).toBe(0);
    const statuses = (await salesService.list("store-centro")).map((sale) => sale.status).sort();
    expect(statuses).toEqual(["CONFIRMED", "QUOTE"]);
    expect(await inventoryService.history("store-centro")).toHaveLength(2);
  });

  it("rejects a stale quote and keeps products isolated by store", async () => {
    await database.open();
    const { sale } = await seed(5);
    await salesService.confirm(sale);
    await expect(salesService.confirm(sale)).rejects.toThrow("pendentes");
    const otherProduct = await inventoryService.create("store-shopping", { name: "Lente B", quantity: 5, minimumQuantity: 0 });
    const quote = await salesService.createQuote("customer-1", "store-centro", "Venda", 0, [saleItem(otherProduct, 1)]);
    await expect(salesService.confirm(quote)).rejects.toThrow("não encontrado nesta loja");
    expect((await salesService.list("store-centro")).filter((entry) => entry.status === "CONFIRMED")).toHaveLength(1);
    expect((await inventoryService.list("store-shopping"))[0].quantity).toBe(5);
    expect(await inventoryService.history("store-shopping")).toHaveLength(1);
  });
});
