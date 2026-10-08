import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkOrderService } from "./work-order-service";
import type { Sale } from "./sales";
import type { WorkOrder, WorkOrderStatus } from "./work-order";
import { canTransition } from "./work-order";

const repository = { listByStore: vi.fn(), getBySale: vi.fn(), create: vi.fn(), update: vi.fn() };
const service = new WorkOrderService(repository);
const confirmedSale: Sale = { id: "sale-1", customerId: "customer-1", storeId: "store-centro", status: "CONFIRMED", description: "Armação + lente", total: 300, createdAt: "2026-01-01T10:00:00.000Z" };
const openOrder: WorkOrder = { id: "os-1", saleId: "sale-1", customerId: "customer-1", storeId: "store-centro", status: "OPEN", createdAt: "2026-01-01T10:05:00.000Z" };
beforeEach(() => { vi.resetAllMocks(); });

describe("order creation", () => {
  it("rejects a sale that is not confirmed", async () => {
    await expect(service.createFromConfirmedSale({ ...confirmedSale, status: "QUOTE" })).rejects.toThrow("confirmar a venda");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates a single open order and returns the repository result", async () => {
    const created: WorkOrder = { ...openOrder };
    repository.create.mockResolvedValue(created);
    const order = await service.createFromConfirmedSale(confirmedSale);
    expect(order).toEqual(created);
    expect(repository.create).toHaveBeenCalledOnce();
    expect(repository.create.mock.calls[0][0]).toMatchObject({ saleId: "sale-1", storeId: "store-centro", status: "OPEN" });
  });
});

describe("status transitions", () => {
  it("walks the production flow and stamps author and date", async () => {
    repository.update.mockImplementation(async (order) => order);
    const produced = await service.transition(openOrder, "IN_PRODUCTION", "Operador");
    expect(produced).toMatchObject({ status: "IN_PRODUCTION", updatedBy: "Operador" });
    expect(produced.updatedAt).toBeTruthy();
    const ready = await service.transition(produced, "READY", "Operador");
    expect(ready.status).toBe("READY");
    const delivered = await service.transition(ready, "DELIVERED", "Operador");
    expect(delivered.status).toBe("DELIVERED");
    expect(repository.update).toHaveBeenCalledTimes(3);
    expect(repository.update.mock.calls[0][1]).toBe("OPEN");
  });

  it("rejects jumps, terminal statuses and an empty author", async () => {
    await expect(service.transition(openOrder, "DELIVERED", "Operador")).rejects.toThrow("Transição inválida");
    await expect(service.transition({ ...openOrder, status: "DELIVERED" }, "OPEN", "Operador")).rejects.toThrow("Transição inválida");
    await expect(service.transition({ ...openOrder, status: "CANCELLED" }, "IN_PRODUCTION", "Operador")).rejects.toThrow("Transição inválida");
    await expect(service.transition(openOrder, "IN_PRODUCTION", "  ")).rejects.toThrow("responsável");
    await expect(service.transition(openOrder, "OPEN", "Operador")).rejects.toThrow("já está");
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("only allows the documented transitions", () => {
    expect(canTransition("OPEN", "IN_PRODUCTION")).toBe(true);
    expect(canTransition("OPEN", "CANCELLED")).toBe(true);
    expect(canTransition("IN_PRODUCTION", "READY")).toBe(true);
    expect(canTransition("READY", "DELIVERED")).toBe(true);
    expect(canTransition("READY", "OPEN")).toBe(false);
    expect(canTransition("DELIVERED", "CANCELLED")).toBe(false);
    expect(canTransition("CANCELLED", "READY")).toBe(false);
  });
});

describe("due date and notes", () => {
  it("stores a normalized prazo with author", async () => {
    repository.update.mockImplementation(async (order) => order);
    const updated = await service.schedule(openOrder, { dueAt: " 2026-02-10T12:00:00.000Z ", notes: "  Entregar no balcão  " }, "Operador");
    expect(updated).toMatchObject({ dueAt: "2026-02-10T12:00:00.000Z", notes: "Entregar no balcão", updatedBy: "Operador" });
    expect(repository.update).toHaveBeenCalledOnce();
    expect(repository.update.mock.calls[0][1]).toBe("OPEN");
  });

  it("clears prazo and notes when they come empty", async () => {
    repository.update.mockImplementation(async (order) => order);
    const withValues: WorkOrder = { ...openOrder, dueAt: "2026-02-10T12:00:00.000Z", notes: "Antiga" };
    const updated = await service.schedule(withValues, { dueAt: "", notes: "   " }, "Operador");
    expect(updated.dueAt).toBeUndefined();
    expect(updated.notes).toBeUndefined();
  });

  it("rejects an invalid prazo and a missing author", async () => {
    await expect(service.schedule(openOrder, { dueAt: "não-é-data" }, "Operador")).rejects.toThrow("prazo válido");
    await expect(service.schedule(openOrder, { dueAt: "2026-02-10" }, " ")).rejects.toThrow("responsável");
    expect(repository.update).not.toHaveBeenCalled();
  });
});

describe("listing", () => {
  it("delegates the store listing to the repository", async () => {
    repository.listByStore.mockResolvedValue([openOrder]);
    const orders: WorkOrderStatus[] = (await service.list("store-centro")).map((order) => order.status);
    expect(orders).toEqual(["OPEN"]);
    expect(repository.listByStore).toHaveBeenCalledWith("store-centro");
  });
});
