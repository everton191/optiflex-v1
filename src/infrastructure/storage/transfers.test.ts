import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { availableQuantity } from "../../domain/inventory";
import { InventoryService } from "../../domain/inventory-service";
import { SalesService } from "../../domain/sales-service";
import type { SaleItem } from "../../domain/sales";
import { TransferService } from "../../domain/transfer-service";
import { database } from "./database";
import { LocalInventoryRepository, LocalSaleRepository, LocalTransferRepository } from "./local-repositories";

const inventoryRepository = new LocalInventoryRepository();
const transferService = new TransferService(new LocalTransferRepository(), inventoryRepository);
const inventoryService = new InventoryService(inventoryRepository);
const salesService = new SalesService(new LocalSaleRepository(), undefined, undefined, inventoryRepository);
const saleItem = (product: { id: string; name: string }, quantity: number): SaleItem => ({ inventoryItemId: product.id, name: product.name, quantity, unitPrice: 120 });

afterEach(async () => { await database.delete(); });

async function seedItem(storeId: string, quantity: number, code?: string) {
  return inventoryService.create(storeId, { name: "Lente", code, quantity, minimumQuantity: 0, category: "LENS" }, "Operador");
}

const stock = async (storeId: string, id: string) => (await inventoryService.list(storeId)).find((entry) => entry.id === id)!;
const movements = async (storeId: string) => inventoryRepository.listMovements(storeId);

describe("store transfers", () => {
  it("completes the request, separate, transit and receive cycle moving stock once", async () => {
    await database.open();
    const origin = await seedItem("store-centro", 10, "LT-1");
    const transfer = await transferService.request("store-centro", "store-shopping", [{ inventoryItemId: origin.id, name: "Lente", quantity: 3 }], "Operador", "Reposição shopping");
    expect(transfer.status).toBe("REQUESTED");
    expect(await stock("store-centro", origin.id)).toMatchObject({ quantity: 10 });
    const separated = await transferService.separate(transfer.id, "Estoquista");
    expect(separated.status).toBe("SEPARATED");
    expect(await stock("store-centro", origin.id)).toMatchObject({ quantity: 7 });
    const transit = await transferService.markInTransit(transfer.id, "Motorista");
    expect(transit.status).toBe("IN_TRANSIT");
    expect(await inventoryService.list("store-shopping")).toHaveLength(0);
    const received = await transferService.receive(transfer.id, "Recebedor");
    expect(received.status).toBe("RECEIVED");
    expect(await stock("store-centro", origin.id)).toMatchObject({ quantity: 7 });
    const destination = (await inventoryService.list("store-shopping")).find((item) => item.code === "LT-1");
    expect(destination).toMatchObject({ name: "Lente", quantity: 3 });
    expect((await movements("store-centro")).filter((movement) => movement.type === "OUT")).toHaveLength(1);
    expect((await movements("store-shopping")).filter((movement) => movement.type === "IN")).toHaveLength(1);
    expect(await transferService.list("store-centro")).toHaveLength(1);
    expect(await transferService.list("store-shopping")).toHaveLength(1);
  });

  it("refuses to separate more than the available balance under concurrency", async () => {
    await database.open();
    const product = await seedItem("store-centro", 5, "LT-2");
    const line = { inventoryItemId: product.id, name: "Lente", quantity: 4 };
    const first = await transferService.request("store-centro", "store-shopping", [line], "Operador");
    const second = await transferService.request("store-centro", "store-shopping", [line], "Operador");
    await transferService.separate(first.id, "Estoquista");
    await expect(transferService.separate(second.id, "Estoquista")).rejects.toThrow("Saldo disponível insuficiente");
    expect(await stock("store-centro", product.id)).toMatchObject({ quantity: 1 });
    const remaining = await transferService.list("store-centro");
    expect(remaining.filter((transfer) => transfer.status === "SEPARATED")).toHaveLength(1);
    expect(remaining.filter((transfer) => transfer.status === "REQUESTED")).toHaveLength(1);
  });

  it("rejects invalid transitions and duplicate receives", async () => {
    await database.open();
    const product = await seedItem("store-centro", 3, "LT-3");
    const transfer = await transferService.request("store-centro", "store-shopping", [{ inventoryItemId: product.id, name: "Lente", quantity: 1 }], "Operador");
    await expect(transferService.markInTransit(transfer.id, "Motorista")).rejects.toThrow("Somente transferências separadas");
    await expect(transferService.receive(transfer.id, "Recebedor")).rejects.toThrow("Somente transferências em trânsito");
    await transferService.separate(transfer.id, "Estoquista");
    await expect(transferService.separate(transfer.id, "Estoquista")).rejects.toThrow("Somente transferências solicitadas");
    await transferService.markInTransit(transfer.id, "Motorista");
    await transferService.receive(transfer.id, "Recebedor");
    await expect(transferService.receive(transfer.id, "Recebedor")).rejects.toThrow("Somente transferências em trânsito");
    await expect(transferService.markInTransit(transfer.id, "Motorista")).rejects.toThrow("Somente transferências separadas");
    expect(await stock("store-centro", product.id)).toMatchObject({ quantity: 2 });
  });

  it("cancels before separation without stock effect and restores the origin after separation", async () => {
    await database.open();
    const product = await seedItem("store-centro", 4, "LT-4");
    const requested = await transferService.request("store-centro", "store-shopping", [{ inventoryItemId: product.id, name: "Lente", quantity: 2 }], "Operador");
    const cancelledEarly = await transferService.cancel(requested.id, "Gerente", "Prioridade mudou");
    expect(cancelledEarly.status).toBe("CANCELLED");
    expect(await stock("store-centro", product.id)).toMatchObject({ quantity: 4 });
    const separated = await transferService.request("store-centro", "store-shopping", [{ inventoryItemId: product.id, name: "Lente", quantity: 2 }], "Operador");
    await transferService.separate(separated.id, "Estoquista");
    expect(await stock("store-centro", product.id)).toMatchObject({ quantity: 2 });
    const cancelled = await transferService.cancel(separated.id, "Gerente", "Cliente desistiu");
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelReason).toBe("Cliente desistiu");
    expect(await stock("store-centro", product.id)).toMatchObject({ quantity: 4 });
    expect((await movements("store-centro")).filter((movement) => movement.type === "IN")).toHaveLength(2);
    expect((await movements("store-centro")).filter((movement) => movement.reason?.includes("Cancelamento"))).toHaveLength(1);
  });

  it("refuses to cancel an in-transit transfer", async () => {
    await database.open();
    const product = await seedItem("store-centro", 3, "LT-5");
    const transfer = await transferService.request("store-centro", "store-shopping", [{ inventoryItemId: product.id, name: "Lente", quantity: 1 }], "Operador");
    await transferService.separate(transfer.id, "Estoquista");
    await transferService.markInTransit(transfer.id, "Motorista");
    await expect(transferService.cancel(transfer.id, "Gerente", "Arrependimento")).rejects.toThrow("não pode ser cancelada");
    expect(await stock("store-centro", product.id)).toMatchObject({ quantity: 2 });
  });

  it("matches an existing destination item by code and merges the received quantity", async () => {
    await database.open();
    await seedItem("store-shopping", 2, "LT-9");
    const origin = await seedItem("store-centro", 5, "LT-9");
    const transfer = await transferService.request("store-centro", "store-shopping", [{ inventoryItemId: origin.id, name: "Lente", quantity: 2 }], "Operador");
    await transferService.separate(transfer.id, "Estoquista");
    await transferService.markInTransit(transfer.id, "Motorista");
    await transferService.receive(transfer.id, "Recebedor");
    const destinationItems = await inventoryService.list("store-shopping");
    expect(destinationItems).toHaveLength(1);
    expect(destinationItems[0]).toMatchObject({ code: "LT-9", quantity: 4 });
  });

  it("respects reservations when separating a transfer", async () => {
    await database.open();
    const product = await seedItem("store-centro", 2, "LT-6");
    await database.customers.add({ id: "customer-1", name: "Cliente", createdAt: "2026-01-01T09:00:00.000Z" });
    await salesService.createQuote("customer-1", "store-centro", "Reserva", 0, [saleItem(product, 1)]);
    expect(availableQuantity(await stock("store-centro", product.id))).toBe(1);
    await expect(transferService.request("store-centro", "store-shopping", [{ inventoryItemId: product.id, name: "Lente", quantity: 2 }], "Operador")).rejects.toThrow("Saldo disponível insuficiente");
    const transfer = await transferService.request("store-centro", "store-shopping", [{ inventoryItemId: product.id, name: "Lente", quantity: 1 }], "Operador");
    await transferService.separate(transfer.id, "Estoquista");
    const reserved = await stock("store-centro", product.id);
    expect(reserved).toMatchObject({ quantity: 1, reservedQuantity: 1 });
    expect(availableQuantity(reserved)).toBe(0);
  });

  it("survives reopen with the transfer and stock intact", async () => {
    await database.open();
    const product = await seedItem("store-centro", 4, "LT-7");
    const transfer = await transferService.request("store-centro", "store-shopping", [{ inventoryItemId: product.id, name: "Lente", quantity: 2 }], "Operador");
    await transferService.separate(transfer.id, "Estoquista");
    await transferService.markInTransit(transfer.id, "Motorista");
    database.close();
    await database.open();
    expect(await stock("store-centro", product.id)).toMatchObject({ quantity: 2 });
    const reloaded = await transferService.list("store-centro");
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]).toMatchObject({ status: "IN_TRANSIT", fromStoreId: "store-centro", toStoreId: "store-shopping" });
    const received = await transferService.receive(reloaded[0].id, "Recebedor");
    expect(received.status).toBe("RECEIVED");
  });

  it("creates a new destination item when no product matches by code or name", async () => {
    await database.open();
    const origin = await seedItem("store-centro", 3, "LT-8");
    const transfer = await transferService.request("store-centro", "store-shopping", [{ inventoryItemId: origin.id, name: "Lente", quantity: 3 }], "Operador");
    await transferService.separate(transfer.id, "Estoquista");
    await transferService.markInTransit(transfer.id, "Motorista");
    await transferService.receive(transfer.id, "Recebedor");
    const destinationItems = await inventoryService.list("store-shopping");
    expect(destinationItems).toHaveLength(1);
    expect(destinationItems[0]).toMatchObject({ name: "Lente", code: "LT-8", quantity: 3, category: "LENS", minimumQuantity: 0 });
    expect((await movements("store-shopping"))[0]).toMatchObject({ type: "IN", quantity: 3 });
  });

  it("rejects requests with invalid lines, same store or empty author", async () => {
    await database.open();
    const product = await seedItem("store-centro", 2, "LT-A");
    await expect(transferService.request("store-centro", "store-centro", [{ inventoryItemId: product.id, name: "Lente", quantity: 1 }], "Operador")).rejects.toThrow("precisa sair de uma loja");
    await expect(transferService.request("store-centro", "store-shopping", [{ inventoryItemId: product.id, name: "Lente", quantity: 0 }], "Operador")).rejects.toThrow();
    await expect(transferService.request("store-centro", "store-shopping", [{ inventoryItemId: product.id, name: "Lente", quantity: 1 }], "   ")).rejects.toThrow("Informe quem está solicitando");
    await expect(transferService.request("store-centro", "store-shopping", [{ inventoryItemId: product.id, name: "Lente", quantity: 3 }], "Operador")).rejects.toThrow("Saldo disponível insuficiente");
    await expect(transferService.request("store-centro", "store-shopping", [{ inventoryItemId: "missing", name: "Fantasma", quantity: 1 }], "Operador")).rejects.toThrow("não encontrado");
  });
});
