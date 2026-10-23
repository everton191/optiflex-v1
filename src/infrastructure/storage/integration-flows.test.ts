import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { SaleItem } from "../../domain/sales";
import { InventoryService } from "../../domain/inventory-service";
import { SalesService } from "../../domain/sales-service";
import { CashService } from "../../domain/cash-service";
import { WorkOrderService } from "../../domain/work-order-service";
import { cashTotals } from "../../domain/cash";
import { database } from "./database";
import { LocalCashRepository, LocalInventoryRepository, LocalSaleRepository, LocalWorkOrderRepository } from "./local-repositories";

const inventory = new InventoryService(new LocalInventoryRepository());
const sales = new SalesService(new LocalSaleRepository(), undefined, undefined, new LocalInventoryRepository());
const cash = new CashService(new LocalCashRepository(), new LocalSaleRepository());
const workOrders = new WorkOrderService(new LocalWorkOrderRepository());
const cashRepository = new LocalCashRepository();

afterEach(async () => { await database.delete(); });

const saleItem = (product: { id: string; name: string }, quantity: number): SaleItem => ({ inventoryItemId: product.id, name: product.name, quantity, unitPrice: 120 });

async function seedSale(productQuantity: number, itemQuantity = 1) {
  await database.customers.add({ id: "customer-1", name: "Cliente Integrado", createdAt: "2026-01-01T09:00:00.000Z" });
  const product = await inventory.create("store-centro", { name: "Lente", code: `LT-${crypto.randomUUID().slice(0, 8)}`, quantity: productQuantity, minimumQuantity: 0, category: "LENS" }, "Operador");
  const quote = await sales.createQuote("customer-1", "store-centro", "Venda integrada", 0, [saleItem(product, itemQuantity)]);
  return { product, quote };
}

describe("integration flows across sale, cash, inventory and work orders", () => {
  it("walks sale confirmation, PIX payment, cash closing and order delivery end to end", async () => {
    await database.open();
    const { quote } = await seedSale(5);
    const confirmed = await sales.confirm(quote);
    expect(confirmed).toMatchObject({ status: "CONFIRMED", paymentStatus: "PENDING", total: 120 });
    expect((await inventory.list("store-centro"))[0].quantity).toBe(4);

    await cash.open("store-centro", 100);
    const receipt = await cash.receive("store-centro", confirmed.id, 120, "PIX", "E2E-PIX-1");
    expect(receipt).toMatchObject({ saleId: confirmed.id, type: "RECEIPT", paymentMethod: "PIX", reason: "E2E-PIX-1" });
    expect((await sales.list("store-centro"))[0].paymentStatus).toBe("PAID");

    const order = await workOrders.createFromConfirmedSale(confirmed, "Ana");
    const inProduction = await workOrders.transition(order, "IN_PRODUCTION", "Ana");
    const laboratory = await workOrders.setLaboratory(inProduction, { id: "supplier-lab-central", name: "Lab Central" }, "Ana");
    const ready = await workOrders.transition(laboratory, "READY", "Ana");
    const delivered = await workOrders.transition(ready, "DELIVERED", "Ana");
    expect(delivered).toMatchObject({ status: "DELIVERED", updatedBy: "Ana", laboratory: "Lab Central", laboratoryId: "supplier-lab-central" });

    const totals = cashTotals(100, await cashRepository.listEntries("store-centro"));
    expect(totals).toMatchObject({ receipts: 120, refunds: 0, expected: 220 });
    const closed = await cash.close("store-centro", 220, "Ana", "Fechado com a venda integrada");
    expect(closed).toMatchObject({ expectedBalance: 220, closingBalance: 220, difference: 0, closedBy: "Ana" });

    database.close();
    await database.open();
    expect((await sales.list("store-centro"))[0]).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
    expect((await inventory.list("store-centro"))[0].quantity).toBe(4);
    expect(await workOrders.getBySale(confirmed.id)).toMatchObject({ status: "DELIVERED", laboratory: "Lab Central", laboratoryId: "supplier-lab-central" });
    expect((await workOrders.list("store-centro"))[0].events?.map((event) => event.type)).toEqual(["CREATED", "STATUS", "LABORATORY", "STATUS", "STATUS"]);
    const sessions = await cashRepository.listSessions("store-centro");
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ closingBalance: 220, expectedBalance: 220, difference: 0, closedBy: "Ana" });
    expect((await cashRepository.listEntries("store-centro")).filter((entry) => entry.reason === "E2E-PIX-1")).toHaveLength(1);
  });

  it("reverses stock and cash and reconciles the closing when a paid sale is cancelled", async () => {
    await database.open();
    const { quote } = await seedSale(5);
    const confirmed = await sales.confirm(quote);
    await cash.open("store-centro", 100);
    await cash.receive("store-centro", confirmed.id, 120, "CASH");
    const cancelled = await sales.cancel(confirmed, "Cliente devolveu", "Ana");

    expect(cancelled).toMatchObject({ status: "CANCELLED", cancelReason: "Cliente devolveu", cancelledBy: "Ana" });
    expect((await inventory.list("store-centro"))[0].quantity).toBe(5);
    const entries = await cashRepository.listEntries("store-centro");
    expect(entries.find((entry) => entry.type === "REFUND")).toMatchObject({ saleId: confirmed.id, amount: 120, reason: "Cliente devolveu", author: "Ana" });
    expect(cashTotals(100, entries)).toMatchObject({ receipts: 120, refunds: 120, expected: 100 });
    const closed = await cash.close("store-centro", 100, "Ana", "Estorno conciliado");
    expect(closed).toMatchObject({ expectedBalance: 100, difference: 0 });

    database.close();
    await database.open();
    expect((await sales.list("store-centro"))[0]).toMatchObject({ status: "CANCELLED" });
    expect((await inventory.list("store-centro"))[0].quantity).toBe(5);
    expect(await inventory.history("store-centro")).toHaveLength(3);
    expect((await cashRepository.listSessions("store-centro"))[0]).toMatchObject({ closingBalance: 100, expectedBalance: 100, difference: 0 });
    expect((await cashRepository.listEntries("store-centro")).filter((entry) => entry.type === "REFUND")).toHaveLength(1);
  });

  it("spends inventory through work order inputs and delivers after reopen", async () => {
    await database.open();
    const { quote } = await seedSale(5);
    const confirmed = await sales.confirm(quote);
    const order = await workOrders.createFromConfirmedSale(confirmed, "Ana");
    const withInputs = await workOrders.recordInputs(order, [{ itemId: (await inventory.list("store-centro"))[0].id, name: "Lente", quantity: 2 }], "Ana");
    expect((await inventory.list("store-centro"))[0].quantity).toBe(2);

    const produced = await workOrders.transition(withInputs, "IN_PRODUCTION", "Ana");
    const ready = await workOrders.transition(produced, "READY", "Ana");
    const delivered = await workOrders.transition(ready, "DELIVERED", "Ana");
    expect(delivered.status).toBe("DELIVERED");
    const movements = await inventory.history("store-centro");
    expect(movements).toHaveLength(3);
    expect(movements.find((movement) => movement.reason === "Venda: Venda integrada")).toMatchObject({ type: "OUT", quantity: 1 });
    expect(movements.find((movement) => movement.reason?.startsWith("Insumos OS"))).toMatchObject({ type: "OUT", quantity: 2, author: "Ana" });

    database.close();
    await database.open();
    expect(await workOrders.getBySale(confirmed.id)).toMatchObject({ status: "DELIVERED" });
    expect((await inventory.list("store-centro"))[0].quantity).toBe(2);
    expect((await sales.list("store-centro"))[0].paymentStatus).toBe("PENDING");
  });

  it("collects a sale in two receipts, rejects overpayment and keeps cash reconciled", async () => {
    await database.open();
    const { quote } = await seedSale(3, 2);
    const confirmed = await sales.confirm(quote);
    expect(confirmed.total).toBe(240);
    await cash.open("store-centro", 0);
    await cash.receive("store-centro", confirmed.id, 100, "PIX", "PARC-1");
    expect((await sales.list("store-centro"))[0].paymentStatus).toBe("PARTIAL");
    await cash.receive("store-centro", confirmed.id, 140, "CARD");
    expect((await sales.list("store-centro"))[0].paymentStatus).toBe("PAID");
    await expect(cash.receive("store-centro", confirmed.id, 1, "CASH")).rejects.toThrow("já foi recebida");

    await cash.close("store-centro", 240, "Ana");
    const reopened = await cash.open("store-centro", 0);
    expect(reopened).toMatchObject({ openingBalance: 0 });
    await expect(cash.receive("store-centro", confirmed.id, 1, "CASH")).rejects.toThrow("já foi recebida");
    const [closedSession] = (await cashRepository.listSessions("store-centro")).filter((session) => session.closedAt);
    expect(closedSession).toMatchObject({ closingBalance: 240, expectedBalance: 240, difference: 0 });
    expect((await cashRepository.listEntries("store-centro")).filter((entry) => entry.type === "RECEIPT")).toHaveLength(2);
  });
});
