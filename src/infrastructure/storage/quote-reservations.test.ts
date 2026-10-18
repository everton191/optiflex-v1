import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { SaleItem } from "../../domain/sales";
import { InventoryService } from "../../domain/inventory-service";
import { SalesService } from "../../domain/sales-service";
import { availableQuantity } from "../../domain/inventory";
import { database } from "./database";
import { LocalInventoryRepository, LocalSaleRepository } from "./local-repositories";

const inventoryRepository = new LocalInventoryRepository();
const salesService = new SalesService(new LocalSaleRepository(), undefined, undefined, inventoryRepository);
const inventoryService = new InventoryService(inventoryRepository);
const saleItem = (product: { id: string; name: string }, quantity: number): SaleItem => ({ inventoryItemId: product.id, name: product.name, quantity, unitPrice: 120 });

afterEach(async () => { await database.delete(); });

async function seedItem(quantity: number) {
  await database.customers.add({ id: "customer-1", name: "Cliente", createdAt: "2026-01-01T09:00:00.000Z" });
  return inventoryService.create("store-centro", { name: "Lente", code: "LT-1", quantity, minimumQuantity: 0, category: "LENS" }, "Operador");
}

const stock = async (id: string) => (await inventoryService.list("store-centro")).find((entry) => entry.id === id)!;

describe("quote reservations", () => {
  it("reserves on creation and blocks another quote from the same balance", async () => {
    await database.open();
    const product = await seedItem(1);
    const first = await salesService.createQuote("customer-1", "store-centro", "Primeira", 0, [saleItem(product, 1)]);
    expect(first.status).toBe("QUOTE");
    expect(await stock(product.id)).toMatchObject({ quantity: 1, reservedQuantity: 1 });
    expect(availableQuantity(await stock(product.id))).toBe(0);
    await expect(salesService.createQuote("customer-1", "store-centro", "Segunda", 0, [saleItem(product, 1)])).rejects.toThrow("Saldo disponível insuficiente");
    expect(await salesService.list("store-centro")).toHaveLength(1);
  });

  it("releases on cancellation and allows a new quote afterwards", async () => {
    await database.open();
    const product = await seedItem(1);
    const first = await salesService.createQuote("customer-1", "store-centro", "Primeira", 0, [saleItem(product, 1)]);
    await salesService.cancel(first, "Cliente desistiu", "Vendedor");
    expect(await stock(product.id)).toMatchObject({ quantity: 1 });
    expect((await stock(product.id)).reservedQuantity).toBeFalsy();
    const second = await salesService.createQuote("customer-1", "store-centro", "Segunda", 0, [saleItem(product, 1)]);
    expect(second.status).toBe("QUOTE");
    expect(await stock(product.id)).toMatchObject({ reservedQuantity: 1 });
  });

  it("releases when the quote expires or is rejected", async () => {
    await database.open();
    const product = await seedItem(2);
    const first = await salesService.createQuote("customer-1", "store-centro", "Primeira", 0, [saleItem(product, 2)]);
    const sent = await salesService.transitionQuote(first, "SENT");
    await salesService.transitionQuote(sent, "EXPIRED");
    expect((await stock(product.id)).reservedQuantity).toBeFalsy();
    const second = await salesService.createQuote("customer-1", "store-centro", "Segunda", 0, [saleItem(product, 2)]);
    const sentSecond = await salesService.transitionQuote(second, "SENT");
    await salesService.transitionQuote(sentSecond, "REJECTED");
    expect((await stock(product.id)).reservedQuantity).toBeFalsy();
    expect(availableQuantity(await stock(product.id))).toBe(2);
  });

  it("converts the reservation into a deduction on confirmation", async () => {
    await database.open();
    const product = await seedItem(5);
    const quote = await salesService.createQuote("customer-1", "store-centro", "Venda", 0, [saleItem(product, 2)]);
    expect(await stock(product.id)).toMatchObject({ reservedQuantity: 2 });
    await salesService.confirm(quote);
    expect(await stock(product.id)).toMatchObject({ quantity: 3 });
    expect((await stock(product.id)).reservedQuantity).toBeFalsy();
    expect(availableQuantity(await stock(product.id))).toBe(3);
  });

  it("adjusts the reservation when a draft is edited and releases removed items", async () => {
    await database.open();
    const product = await seedItem(4);
    const quote = await salesService.createQuote("customer-1", "store-centro", "Rascunho", 0, [saleItem(product, 1)]);
    expect(await stock(product.id)).toMatchObject({ reservedQuantity: 1 });
    const updated = await salesService.updateQuote(quote, { customerId: "customer-1", description: "Rascunho", total: 0, items: [saleItem(product, 3)] });
    expect(updated.items?.[0].quantity).toBe(3);
    expect(await stock(product.id)).toMatchObject({ reservedQuantity: 3 });
    await expect(salesService.updateQuote(updated, { customerId: "customer-1", description: "Rascunho", total: 0, items: [saleItem(product, 5)] })).rejects.toThrow("Saldo disponível insuficiente");
    expect(await stock(product.id)).toMatchObject({ reservedQuantity: 3 });
    const cleared = await salesService.updateQuote(updated, { customerId: "customer-1", description: "Rascunho", total: 100, items: [] });
    expect(cleared.items).toBeUndefined();
    expect((await stock(product.id)).reservedQuantity).toBeFalsy();
  });

  it("cancels a legacy quote without recorded reservation without breaking", async () => {
    await database.open();
    const product = await seedItem(2);
    await database.sales.add({ id: "sale-legacy", customerId: "customer-1", storeId: "store-centro", status: "QUOTE", paymentStatus: "PENDING", description: "Legado", total: 100, items: [saleItem(product, 1)], createdAt: "2026-01-01T09:00:00.000Z" });
    const legacy = (await salesService.list("store-centro"))[0];
    const cancelled = await salesService.cancel(legacy, "Sem reserva gravada", "Vendedor");
    expect(cancelled.status).toBe("CANCELLED");
    expect((await stock(product.id)).reservedQuantity).toBeFalsy();
  });

  it("keeps manual adjustments from eating reserved stock", async () => {
    await database.open();
    const product = await seedItem(3);
    await salesService.createQuote("customer-1", "store-centro", "Reserva", 0, [saleItem(product, 2)]);
    await expect(inventoryService.adjust(await stock(product.id), "OUT", 2, "Ajuste manual", "Estoquista")).rejects.toThrow("Saldo disponível insuficiente");
    const ok = await inventoryService.adjust(await stock(product.id), "OUT", 1, "Ajuste manual", "Estoquista");
    expect(ok.quantity).toBe(2);
    expect(ok.reservedQuantity).toBe(2);
  });

  it("survives reopen with the reservation intact", async () => {
    await database.open();
    const product = await seedItem(2);
    await salesService.createQuote("customer-1", "store-centro", "Reserva", 0, [saleItem(product, 2)]);
    database.close();
    await database.open();
    expect(await stock(product.id)).toMatchObject({ quantity: 2, reservedQuantity: 2 });
    expect(availableQuantity(await stock(product.id))).toBe(0);
  });
});
