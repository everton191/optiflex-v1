import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { SaleItem } from "../../domain/sales";
import { InventoryService } from "../../domain/inventory-service";
import { SalesService } from "../../domain/sales-service";
import { CashService } from "../../domain/cash-service";
import { cashTotals } from "../../domain/cash";
import { database } from "./database";
import { LocalCashRepository, LocalInventoryRepository, LocalSaleRepository } from "./local-repositories";

const salesService = new SalesService(new LocalSaleRepository());
const inventoryService = new InventoryService(new LocalInventoryRepository());
const cashService = new CashService(new LocalCashRepository(), new LocalSaleRepository());
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

describe("sale cancellation restores stock and refunds cash", () => {
  it("cancels a paid sale, restores stock, refunds cash and survives reopen", async () => {
    await database.open();
    const { product, sale } = await seed(5);
    const confirmed = await salesService.confirm(sale);
    await cashService.open("store-centro", 100);
    await cashService.receive("store-centro", sale.id, 120, "CASH");
    const cancelled = await salesService.cancel(confirmed, "Cliente devolveu", "Ana");
    expect(cancelled).toMatchObject({ status: "CANCELLED", cancelReason: "Cliente devolveu", cancelledBy: "Ana" });
    expect((await inventoryService.list("store-centro"))[0].quantity).toBe(5);
    const entries = await new LocalCashRepository().listEntries("store-centro");
    const refund = entries.find((entry) => entry.type === "REFUND");
    expect(refund).toMatchObject({ saleId: sale.id, amount: 120, reason: "Cliente devolveu", author: "Ana" });
    const totals = cashTotals(100, entries);
    expect(totals).toMatchObject({ receipts: 120, refunds: 120, expected: 100 });
    database.close();
    await database.open();
    expect((await salesService.list("store-centro"))[0]).toMatchObject({ status: "CANCELLED", cancelReason: "Cliente devolveu" });
    expect((await inventoryService.list("store-centro"))[0].quantity).toBe(5);
    expect((await new LocalCashRepository().listEntries("store-centro")).filter((entry) => entry.type === "REFUND")).toHaveLength(1);
  });

  it("cancels an unpaid confirmed sale without cash entries", async () => {
    await database.open();
    const { sale } = await seed(3);
    const confirmed = await salesService.confirm(sale);
    await salesService.cancel(confirmed, "Desistiu");
    expect((await inventoryService.list("store-centro"))[0].quantity).toBe(3);
    expect(await new LocalCashRepository().listEntries("store-centro")).toHaveLength(0);
  });

  it("blocks double cancellation and cancellation without an open cash session when paid", async () => {
    await database.open();
    const { sale } = await seed(2);
    const confirmed = await salesService.confirm(sale);
    await cashService.open("store-centro", 0);
    await cashService.receive("store-centro", sale.id, 120, "PIX");
    await cashService.close("store-centro", 120, "Ana", "Fechado");
    await expect(salesService.cancel(confirmed, "Devolução")).rejects.toThrow("Abra o caixa antes de registrar o estorno.");
    await cashService.open("store-centro", 0);
    await salesService.cancel(confirmed, "Devolução");
    const reloaded = (await salesService.list("store-centro"))[0];
    await expect(salesService.cancel(reloaded, "De novo")).rejects.toThrow("já foi cancelada");
    expect((await inventoryService.list("store-centro"))[0].quantity).toBe(2);
  });

  it("lets only one of two concurrent cancellations win", async () => {
    await database.open();
    const { sale } = await seed(4);
    const confirmed = await salesService.confirm(sale);
    const results = await Promise.allSettled([salesService.cancel(confirmed, "Um"), salesService.cancel(confirmed, "Dois")]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await salesService.list("store-centro"))[0].status).toBe("CANCELLED");
    expect((await inventoryService.list("store-centro"))[0].quantity).toBe(4);
    expect(await inventoryService.history("store-centro")).toHaveLength(3);
  });

  it("cancels a quote without stock or cash effects", async () => {
    await database.open();
    const { sale } = await seed(5);
    const cancelled = await salesService.cancel(sale, "Não aprovou");
    expect(cancelled.status).toBe("CANCELLED");
    expect((await inventoryService.list("store-centro"))[0].quantity).toBe(5);
    expect(await inventoryService.history("store-centro")).toHaveLength(1);
    expect(await new LocalCashRepository().listEntries("store-centro")).toHaveLength(0);
  });
});
