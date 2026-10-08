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
    const created = await service.createFromConfirmedSale(sale);
    const produced = await service.transition(created, "IN_PRODUCTION", "Operador");
    const scheduled = await service.schedule(produced, { dueAt: "2026-02-10T12:00:00.000Z", notes: "Entrega agendada" }, "Operador");
    expect(scheduled).toMatchObject({ status: "IN_PRODUCTION", updatedBy: "Operador", dueAt: "2026-02-10T12:00:00.000Z", notes: "Entrega agendada" });
    const [stored] = await service.list("store-centro");
    expect(stored).toMatchObject({ status: "IN_PRODUCTION", dueAt: "2026-02-10T12:00:00.000Z", notes: "Entrega agendada" });
    expect(stored.updatedAt).toBeTruthy();
  });

  it("rejects a transition based on a stale status", async () => {
    await database.open();
    const created = await service.createFromConfirmedSale(sale);
    await service.transition(created, "IN_PRODUCTION", "Operador");
    await expect(service.transition(created, "CANCELLED", "Operador")).rejects.toThrow("alterada em outra sessão");
    expect((await service.list("store-centro"))[0].status).toBe("IN_PRODUCTION");
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
