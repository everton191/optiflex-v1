import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import type { Sale } from "../../domain/sales";
import type { WorkOrder } from "../../domain/work-order";
import { WorkOrderService } from "../../domain/work-order-service";
import { database } from "./database";
import { LocalWorkOrderRepository } from "./local-repositories";

const repository = new LocalWorkOrderRepository();
const service = new WorkOrderService(repository);
const sale: Sale = { id: "sale-os-1", customerId: "customer-1", storeId: "store-centro", status: "CONFIRMED", description: "Armação + lente", total: 300, createdAt: "2026-01-01T10:00:00.000Z" };

afterEach(async () => { await database.delete(); });

describe("work order storage", () => {
  it("creates only one order per sale even under concurrency", async () => {
    await database.open();
    const [first, second] = await Promise.all([service.createFromConfirmedSale(sale), service.createFromConfirmedSale(sale)]);
    expect(first.id).toBe(second.id);
    expect(await service.list("store-centro")).toHaveLength(1);
    expect(await service.getBySale(sale.id)).toMatchObject({ id: first.id, status: "OPEN" });
  });

  it("keeps an order per sale across reopen", async () => {
    await database.open();
    const created = await service.createFromConfirmedSale(sale);
    database.close();
    await database.open();
    expect(await service.getBySale(sale.id)).toMatchObject({ id: created.id });
    expect(await service.list("store-centro")).toHaveLength(1);
  });

  it("persists the production flow with author, prazo and notes", async () => {
    await database.open();
    const created = await service.createFromConfirmedSale(sale, "Operador");
    const produced = await service.transition(created, "IN_PRODUCTION", "Operador");
    const scheduled = await service.schedule(produced, { dueAt: "2026-02-10T12:00:00.000Z", notes: "Entrega agendada" }, "Operador");
    expect(scheduled).toMatchObject({ status: "IN_PRODUCTION", updatedBy: "Operador", dueAt: "2026-02-10T12:00:00.000Z", notes: "Entrega agendada" });
    const [stored] = await service.list("store-centro");
    expect(stored).toMatchObject({ status: "IN_PRODUCTION", dueAt: "2026-02-10T12:00:00.000Z", notes: "Entrega agendada" });
    expect(stored.updatedAt).toBeTruthy();
    expect(stored.events?.map((event) => event.type)).toEqual(["CREATED", "STATUS", "SCHEDULE"]);
    database.close(); await database.open();
    const [reopened] = await service.list("store-centro");
    expect(reopened.events?.map((event) => event.type)).toEqual(["CREATED", "STATUS", "SCHEDULE"]);
    expect(reopened.events?.every((event) => event.author === "Operador")).toBe(true);
  });

  it("rejects a transition based on a stale status", async () => {
    await database.open();
    const created = await service.createFromConfirmedSale(sale);
    await service.transition(created, "IN_PRODUCTION", "Operador");
    await expect(service.cancel(created, "Motivo de teste", "Operador")).rejects.toThrow("alterada em outra sessão");
    await expect(service.transition(created, "IN_PRODUCTION", "Operador")).rejects.toThrow("alterada em outra sessão");
    expect((await service.list("store-centro"))[0].status).toBe("IN_PRODUCTION");
  });

  it("persists an audited cancellation with reason and history", async () => {
    await database.open();
    const created = await service.createFromConfirmedSale(sale, "Operador");
    const cancelled = await service.cancel(created, "Cliente desistiu da montagem", "Operador");
    expect(cancelled.status).toBe("CANCELLED");
    const [stored] = await service.list("store-centro");
    expect(stored.cancelReason).toBe("Cliente desistiu da montagem");
    expect(stored.events?.map((event) => event.type)).toEqual(["CREATED", "CANCELLED"]);
    expect(stored.events?.[1]).toMatchObject({ from: "OPEN", to: "CANCELLED", note: "Cliente desistiu da montagem", author: "Operador" });
    await expect(service.cancel(stored, "outra vez", "Operador")).rejects.toThrow("já está cancelada");
    await expect(service.transition(stored, "IN_PRODUCTION", "Operador")).rejects.toThrow("Transição inválida");
    await expect(service.transition(created, "CANCELLED", "Operador")).rejects.toThrow("Cancelamento auditado");
  });

  it("registers inputs atomically, deducting stock only when the whole write succeeds", async () => {
    await database.open();
    await database.inventoryItems.put({ id: "item-lente", storeId: "store-centro", name: "Lente 1.60", quantity: 3, minimumQuantity: 1 });
    const created = await service.createFromConfirmedSale(sale, "Operador");
    const updated = await service.recordInputs(created, [{ itemId: "item-lente", name: "Lente 1.60", quantity: 2 }], "Operador");
    expect(updated.events?.[1]).toMatchObject({ type: "INPUTS", note: "Lente 1.60 × 2", author: "Operador" });
    expect((await database.inventoryItems.get("item-lente"))?.quantity).toBe(1);
    const movements = await database.inventoryMovements.toArray();
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ itemId: "item-lente", type: "OUT", quantity: 2, reason: `Insumos OS ${created.id}`, author: "Operador" });
    await expect(service.recordInputs(updated, [{ itemId: "item-lente", name: "Lente 1.60", quantity: 5 }], "Operador")).rejects.toThrow("Saldo insuficiente");
    const [stored] = await service.list("store-centro");
    expect(stored.events).toHaveLength(2);
    expect((await database.inventoryItems.get("item-lente"))?.quantity).toBe(1);
    expect(await database.inventoryMovements.count()).toBe(1);
  });

  it("isolates orders by store", async () => {
    await database.open();
    const created = await service.createFromConfirmedSale(sale);
    expect(await service.list("store-shopping")).toHaveLength(0);
    await expect(repository.update({ ...created, storeId: "store-shopping", status: "READY" }, "OPEN")).rejects.toThrow("não encontrada");
    expect((await service.list("store-centro"))[0].status).toBe("OPEN");
  });

  it("never regresses immutable fields on update", async () => {
    await database.open();
    const created = await service.createFromConfirmedSale(sale);
    const tampered: WorkOrder = { ...created, saleId: "sale-outro", customerId: "customer-9", createdAt: "2030-01-01T00:00:00.000Z", status: "DELIVERED" };
    const updated = await repository.update(tampered, "OPEN");
    expect(updated).toMatchObject({ saleId: "sale-os-1", customerId: "customer-1", createdAt: created.createdAt, status: "DELIVERED" });
  });
});
