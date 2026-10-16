import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkOrderService } from "./work-order-service";
import type { Sale } from "./sales";
import type { WorkOrder, WorkOrderStatus } from "./work-order";
import { canTransition, stageEvent, stageIndexOf } from "./work-order";
import { openOrders } from "./dashboard";

const repository = { listByStore: vi.fn(), getBySale: vi.fn(), create: vi.fn(), update: vi.fn(), recordInputs: vi.fn() };
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
    const order = await service.createFromConfirmedSale(confirmedSale, "Operador");
    expect(order).toEqual(created);
    expect(repository.create).toHaveBeenCalledOnce();
    expect(repository.create.mock.calls[0][0]).toMatchObject({ saleId: "sale-1", storeId: "store-centro", status: "OPEN" });
    expect(repository.create.mock.calls[0][0].events).toHaveLength(1);
    expect(repository.create.mock.calls[0][0].events[0]).toMatchObject({ type: "CREATED", author: "Operador" });
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
    expect(repository.update.mock.calls[0][0].events).toHaveLength(1);
    expect(repository.update.mock.calls[0][0].events[0]).toMatchObject({ type: "STATUS", from: "OPEN", to: "IN_PRODUCTION", author: "Operador" });
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

  it("walks the fine-grained fabrication stages with author and date", async () => {
    repository.update.mockImplementation(async (order) => order);
    const sent = await service.transition(openOrder, "SENT_TO_LAB", "Operador");
    expect(sent.status).toBe("SENT_TO_LAB");
    const produced = await service.transition(sent, "IN_PRODUCTION", "Operador");
    const returned = await service.transition(produced, "RETURNED", "Operador");
    const inspected = await service.transition(returned, "IN_INSPECTION", "Operador");
    const ready = await service.transition(inspected, "READY", "Operador");
    const notified = await service.transition(ready, "AWAITING_PICKUP", "Operador");
    const delivered = await service.transition(notified, "DELIVERED", "Operador");
    expect(delivered.status).toBe("DELIVERED");
    expect(repository.update).toHaveBeenCalledTimes(7);
    expect(repository.update.mock.calls[6][1]).toBe("AWAITING_PICKUP");
    expect(repository.update.mock.calls[6][0].events.at(-1)).toMatchObject({ type: "STATUS", from: "AWAITING_PICKUP", to: "DELIVERED", author: "Operador" });
  });

  it("blocks jumps that skip fabrication stages", async () => {
    await expect(service.transition(openOrder, "READY", "Operador")).rejects.toThrow("Transição inválida");
    await expect(service.transition({ ...openOrder, status: "SENT_TO_LAB" }, "READY", "Operador")).rejects.toThrow("Transição inválida");
    await expect(service.transition({ ...openOrder, status: "RETURNED" }, "DELIVERED", "Operador")).rejects.toThrow("Transição inválida");
    await expect(service.transition({ ...openOrder, status: "IN_INSPECTION" }, "DELIVERED", "Operador")).rejects.toThrow("Transição inválida");
    await expect(service.transition({ ...openOrder, status: "AWAITING_PICKUP" }, "IN_PRODUCTION", "Operador")).rejects.toThrow("Transição inválida");
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("allows rework from returned and inspection back to production only", () => {
    expect(canTransition("OPEN", "SENT_TO_LAB")).toBe(true);
    expect(canTransition("SENT_TO_LAB", "IN_PRODUCTION")).toBe(true);
    expect(canTransition("IN_PRODUCTION", "RETURNED")).toBe(true);
    expect(canTransition("RETURNED", "IN_INSPECTION")).toBe(true);
    expect(canTransition("RETURNED", "IN_PRODUCTION")).toBe(true);
    expect(canTransition("IN_INSPECTION", "READY")).toBe(true);
    expect(canTransition("IN_INSPECTION", "IN_PRODUCTION")).toBe(true);
    expect(canTransition("READY", "AWAITING_PICKUP")).toBe(true);
    expect(canTransition("AWAITING_PICKUP", "DELIVERED")).toBe(true);
    expect(canTransition("AWAITING_PICKUP", "IN_PRODUCTION")).toBe(false);
    expect(canTransition("READY", "CANCELLED")).toBe(false);
    expect(canTransition("IN_PRODUCTION", "OPEN")).toBe(false);
  });
});

describe("production stage helpers", () => {
  const order: WorkOrder = {
    id: "os-2", saleId: "sale-2", customerId: "customer-1", storeId: "store-centro", status: "IN_INSPECTION", createdAt: "2026-01-01T10:00:00.000Z",
    events: [
      { id: "e1", type: "CREATED", author: "Ana", at: "2026-01-01T10:00:00.000Z" },
      { id: "e2", type: "STATUS", from: "OPEN", to: "SENT_TO_LAB", author: "Bia", at: "2026-01-02T10:00:00.000Z" },
      { id: "e3", type: "STATUS", from: "SENT_TO_LAB", to: "IN_PRODUCTION", author: "Caio", at: "2026-01-03T10:00:00.000Z" },
      { id: "e4", type: "STATUS", from: "IN_PRODUCTION", to: "RETURNED", author: "Caio", at: "2026-01-05T10:00:00.000Z" },
      { id: "e5", type: "STATUS", from: "RETURNED", to: "IN_PRODUCTION", author: "Duda", at: "2026-01-06T10:00:00.000Z" },
      { id: "e6", type: "STATUS", from: "IN_PRODUCTION", to: "IN_INSPECTION", author: "Duda", at: "2026-01-07T10:00:00.000Z" },
    ],
  };

  it("derives the responsible and date of each stage from the history", () => {
    expect(stageIndexOf(order.status)).toBe(4);
    expect(stageIndexOf("CANCELLED")).toBe(-1);
    expect(stageEvent(order, "OPEN")).toMatchObject({ type: "CREATED", author: "Ana" });
    expect(stageEvent(order, "SENT_TO_LAB")).toMatchObject({ author: "Bia", at: "2026-01-02T10:00:00.000Z" });
    expect(stageEvent(order, "IN_PRODUCTION")).toMatchObject({ author: "Duda", at: "2026-01-06T10:00:00.000Z" });
    expect(stageEvent(order, "READY")).toBeUndefined();
  });
});

describe("due date and notes", () => {
  it("stores a normalized prazo with author", async () => {
    repository.update.mockImplementation(async (order) => order);
    const updated = await service.schedule(openOrder, { dueAt: " 2026-02-10T12:00:00.000Z ", notes: "  Entregar no balcão  " }, "Operador");
    expect(updated).toMatchObject({ dueAt: "2026-02-10T12:00:00.000Z", notes: "Entregar no balcão", updatedBy: "Operador" });
    expect(repository.update).toHaveBeenCalledOnce();
    expect(repository.update.mock.calls[0][1]).toBe("OPEN");
    expect(repository.update.mock.calls[0][0].events?.[0]).toMatchObject({ type: "SCHEDULE", author: "Operador" });
    expect(repository.update.mock.calls[0][0].events?.[0].note).toContain("2026");
    expect(repository.update.mock.calls[0][0].events?.[0].note).toContain("Entregar no balcão");
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

describe("audited cancellation", () => {
  it("requires the reason, stamps the author and appends the event", async () => {
    repository.update.mockImplementation(async (order) => order);
    await expect(service.cancel(openOrder, "   ", "Operador")).rejects.toThrow("motivo do cancelamento");
    await expect(service.cancel(openOrder, "Desistiu", "  ")).rejects.toThrow("responsável");
    await expect(service.cancel({ ...openOrder, status: "DELIVERED" }, "Desistiu", "Operador")).rejects.toThrow("Transição inválida");
    await expect(service.cancel({ ...openOrder, status: "CANCELLED" }, "Desistiu", "Operador")).rejects.toThrow("já está cancelada");
    expect(repository.update).not.toHaveBeenCalled();
    const cancelled = await service.cancel(openOrder, "  Cliente desistiu da montagem  ", "Operador");
    expect(cancelled).toMatchObject({ status: "CANCELLED", cancelReason: "Cliente desistiu da montagem", updatedBy: "Operador" });
    expect(cancelled.events).toHaveLength(1);
    expect(cancelled.events?.[0]).toMatchObject({ type: "CANCELLED", from: "OPEN", to: "CANCELLED", note: "Cliente desistiu da montagem", author: "Operador" });
    expect(repository.update).toHaveBeenCalledOnce();
    expect(repository.update.mock.calls[0][1]).toBe("OPEN");
  });

  it("blocks the generic transition into CANCELLED", async () => {
    await expect(service.transition(openOrder, "CANCELLED", "Operador")).rejects.toThrow("Cancelamento auditado");
    expect(repository.update).not.toHaveBeenCalled();
  });
});

describe("work order inputs", () => {
  const items = [{ itemId: "item-1", name: "Lente 1.60", quantity: 2 }];
  it("builds OUT movements and an INPUTS event in one repository call", async () => {
    repository.recordInputs.mockImplementation(async (order) => order);
    const updated = await service.recordInputs(openOrder, items, "Operador");
    expect(updated).toMatchObject({ updatedBy: "Operador" });
    expect(updated.events?.[0]).toMatchObject({ type: "INPUTS", note: "Lente 1.60 × 2", author: "Operador" });
    expect(repository.recordInputs).toHaveBeenCalledOnce();
    const [order, movements, expectedStatus] = repository.recordInputs.mock.calls[0];
    expect(expectedStatus).toBe("OPEN");
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ itemId: "item-1", storeId: "store-centro", type: "OUT", quantity: 2, reason: `Insumos OS ${openOrder.id}`, author: "Operador" });
  });

  it("rejects empty inputs, bad quantities, finished orders and a missing author", async () => {
    await expect(service.recordInputs(openOrder, [], "Operador")).rejects.toThrow("ao menos um insumo");
    await expect(service.recordInputs(openOrder, [{ itemId: "item-1", name: "Lente", quantity: 0 }], "Operador")).rejects.toThrow("Quantidade inválida");
    await expect(service.recordInputs(openOrder, [{ itemId: "item-1", name: "Lente", quantity: Number.NaN }], "Operador")).rejects.toThrow("Quantidade inválida");
    await expect(service.recordInputs(openOrder, items, "   ")).rejects.toThrow("responsável");
    await expect(service.recordInputs({ ...openOrder, status: "DELIVERED" }, items, "Operador")).rejects.toThrow("antes da entrega");
    await expect(service.recordInputs({ ...openOrder, status: "CANCELLED" }, items, "Operador")).rejects.toThrow("antes da entrega");
    expect(repository.recordInputs).not.toHaveBeenCalled();
  });
});

describe("laboratory", () => {
  it("stores the laboratory with an audited event and author", async () => {
    repository.update.mockImplementation(async (order) => order);
    const updated = await service.setLaboratory(openOrder, "  Laboratório Óptico Sul  ", "Operador");
    expect(updated).toMatchObject({ laboratory: "Laboratório Óptico Sul", updatedBy: "Operador" });
    expect(updated.updatedAt).toBeTruthy();
    expect(repository.update).toHaveBeenCalledOnce();
    expect(repository.update.mock.calls[0][1]).toBe("OPEN");
    expect(updated.events?.[0]).toMatchObject({ type: "LABORATORY", author: "Operador" });
    expect(updated.events?.[0].note).toContain("Laboratório Óptico Sul");
  });

  it("rejects empty laboratory, duplicate value, finished orders and a missing author", async () => {
    await expect(service.setLaboratory(openOrder, "   ", "Operador")).rejects.toThrow("Informe o laboratório");
    await expect(service.setLaboratory({ ...openOrder, laboratory: "Sul" }, "Sul", "Operador")).rejects.toThrow("já está registrado");
    await expect(service.setLaboratory({ ...openOrder, status: "DELIVERED" }, "Sul", "Operador")).rejects.toThrow("antes da entrega");
    await expect(service.setLaboratory({ ...openOrder, status: "CANCELLED" }, "Sul", "Operador")).rejects.toThrow("antes da entrega");
    await expect(service.setLaboratory(openOrder, "Sul", "  ")).rejects.toThrow("responsável");
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

describe("work order delivery", () => {
  const repository = { create: vi.fn(), list: vi.fn(), update: vi.fn() };
  const service = new WorkOrderService(repository as never);
  const ready: WorkOrder = { id: "os-1", saleId: "sale-1", customerId: "customer-1", storeId: "store-centro", status: "READY", createdAt: new Date().toISOString() };

  beforeEach(() => {
    repository.create.mockReset();
    repository.list.mockReset();
    repository.update.mockReset();
    repository.update.mockImplementation((order: WorkOrder) => Promise.resolve(order));
  });

  it("records who received the delivery with the event and leaves the pending queues", async () => {
    const delivered = await service.deliver(ready, { receivedBy: "  Maria Souza ", note: "Conferido na loja", pendingCents: 0 }, "Operador");
    expect(delivered.status).toBe("DELIVERED");
    expect(delivered.receivedBy).toBe("Maria Souza");
    expect(delivered.deliveredNote).toBe("Conferido na loja");
    expect(delivered.updatedBy).toBe("Operador");
    const event = delivered.events?.at(-1);
    expect(event).toMatchObject({ type: "DELIVERY", from: "READY", to: "DELIVERED", author: "Operador" });
    expect(event?.note).toContain("Recebido por Maria Souza");
    expect(event?.note).toContain("Conferido na loja");
    expect(repository.update).toHaveBeenCalledOnce();
    expect(repository.update.mock.calls[0][1]).toBe("READY");
    expect(openOrders([delivered])).toEqual([]);
  });

  it("requires the receiver name", async () => {
    await expect(service.deliver(ready, { receivedBy: "   ", pendingCents: 0 }, "Operador")).rejects.toThrow("Informe quem recebeu");
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("blocks delivery with a pending balance unless it is acknowledged", async () => {
    await expect(service.deliver(ready, { receivedBy: "Maria", pendingCents: 15000 }, "Operador")).rejects.toThrow("saldo pendente");
    const delivered = await service.deliver(ready, { receivedBy: "Maria", pendingCents: 15000, acknowledgePending: true }, "Operador");
    expect(delivered.status).toBe("DELIVERED");
  });

  it("blocks delivery from cancelled, delivered or unreachable statuses and rejects invalid balances", async () => {
    await expect(service.deliver({ ...ready, status: "CANCELLED" }, { receivedBy: "Maria", pendingCents: 0 }, "Operador")).rejects.toThrow("cancelada");
    await expect(service.deliver({ ...ready, status: "DELIVERED" }, { receivedBy: "Maria", pendingCents: 0 }, "Operador")).rejects.toThrow("já foi entregue");
    await expect(service.deliver({ ...ready, status: "OPEN" }, { receivedBy: "Maria", pendingCents: 0 }, "Operador")).rejects.toThrow("Transição inválida");
    await expect(service.deliver(ready, { receivedBy: "Maria", pendingCents: -1 }, "Operador")).rejects.toThrow("Saldo a receber inválido");
    expect(repository.update).not.toHaveBeenCalled();
  });
});
