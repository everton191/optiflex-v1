import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryService } from "./inventory-service";
import type { InventoryItem } from "./inventory";
import { movementDelta, stockState } from "./inventory";

const repository = { listByStore: vi.fn(), listMovements: vi.fn(), createItem: vi.fn(), updateItem: vi.fn(), applyMovement: vi.fn() };
const service = new InventoryService(repository);
const item: InventoryItem = { id: "item-1", storeId: "store-centro", name: "Armação", quantity: 10, minimumQuantity: 3 };
beforeEach(() => { vi.resetAllMocks(); });

describe("product registration", () => {
  it("rejects an empty store, a blank name and invalid quantities", async () => {
    await expect(service.create("  ", { name: "Armação", quantity: 1, minimumQuantity: 1 })).rejects.toThrow("Selecione uma loja");
    await expect(service.create("store-centro", { name: "   ", quantity: 1, minimumQuantity: 1 })).rejects.toThrow("Informe o nome do produto");
    await expect(service.create("store-centro", { name: "Armação", quantity: -1, minimumQuantity: 0 })).rejects.toThrow("saldo inicial");
    await expect(service.create("store-centro", { name: "Armação", quantity: 0, minimumQuantity: Number.NaN })).rejects.toThrow("estoque mínimo");
    expect(repository.createItem).not.toHaveBeenCalled();
  });

  it("creates the product together with the initial stock movement", async () => {
    repository.createItem.mockResolvedValue(undefined);
    const created = await service.create("store-centro", { name: "  Lente 1.67  ", code: "  LT-1  ", quantity: 8, minimumQuantity: 2 }, "Operador");
    expect(created).toMatchObject({ storeId: "store-centro", name: "Lente 1.67", code: "LT-1", quantity: 8, minimumQuantity: 2 });
    const [stored, initial] = repository.createItem.mock.calls[0];
    expect(stored).toMatchObject({ name: "Lente 1.67", quantity: 8 });
    expect(initial).toMatchObject({ itemId: stored.id, type: "IN", quantity: 8, reason: "Estoque inicial", author: "Operador" });
  });

  it("creates an empty product without an initial movement", async () => {
    repository.createItem.mockResolvedValue(undefined);
    const created = await service.create("store-centro", { name: "Armação", quantity: 0, minimumQuantity: 0 });
    expect(created).toMatchObject({ quantity: 0 });
    expect(repository.createItem.mock.calls[0][1]).toBeUndefined();
  });
});

describe("product editing", () => {
  it("validates the name and the minimum before writing", async () => {
    await expect(service.update(item, { name: " ", minimumQuantity: 2 })).rejects.toThrow("Informe o nome do produto");
    await expect(service.update(item, { name: "Armação", minimumQuantity: -1 })).rejects.toThrow("estoque mínimo");
    expect(repository.updateItem).not.toHaveBeenCalled();
  });

  it("updates identification and minimum without changing the balance", async () => {
    repository.updateItem.mockResolvedValue(undefined);
    const updated = await service.update(item, { name: "  Armação nova  ", code: " AR-1 ", minimumQuantity: 6 });
    expect(updated).toMatchObject({ name: "Armação nova", code: "AR-1", minimumQuantity: 6, quantity: 10 });
    expect(repository.updateItem).toHaveBeenCalledOnce();
  });
});

describe("inventory movements", () => {
  it("requires a reason and a valid quantity", async () => {
    await expect(service.adjust(item, "IN", 2, "  ")).rejects.toThrow("Informe o motivo");
    await expect(service.adjust(item, "IN", 0, "Compra")).rejects.toThrow("quantidade válida");
    await expect(service.adjust(item, "OUT", Number.NaN, "Venda")).rejects.toThrow("quantidade válida");
    await expect(service.adjust(item, "IN", -2, "Compra")).rejects.toThrow("maior que zero");
    expect(repository.applyMovement).not.toHaveBeenCalled();
  });

  it("blocks an outgoing movement larger than the balance", async () => {
    await expect(service.adjust(item, "OUT", 11, "Venda")).rejects.toThrow("Saldo insuficiente");
    await expect(service.adjust({ ...item, quantity: 2 }, "ADJUSTMENT", -5, "Conferência")).rejects.toThrow("Saldo insuficiente");
    expect(repository.applyMovement).not.toHaveBeenCalled();
  });

  it("registers entry, exit and signed adjustment with the author", async () => {
    repository.applyMovement.mockImplementation(async (movement) => ({ ...item, quantity: item.quantity + (movement.type === "OUT" ? -movement.quantity : movement.quantity) }));
    await service.adjust(item, "IN", 4, "Compra", "Operador");
    expect(repository.applyMovement.mock.calls[0][0]).toMatchObject({ type: "IN", quantity: 4, reason: "Compra", author: "Operador", storeId: "store-centro" });
    await service.adjust(item, "OUT", 4, "Venda", "Operador");
    expect(repository.applyMovement.mock.calls[1][0]).toMatchObject({ type: "OUT", quantity: 4 });
    await service.adjust(item, "ADJUSTMENT", -2, "Conferência", "Operador");
    expect(repository.applyMovement.mock.calls[2][0]).toMatchObject({ type: "ADJUSTMENT", quantity: -2 });
    expect(repository.applyMovement).toHaveBeenCalledTimes(3);
  });
});

describe("stock alerts", () => {
  it("flags out-of-stock and minimum-level products", () => {
    expect(stockState({ quantity: 0, minimumQuantity: 0 })).toBe("OUT");
    expect(stockState({ quantity: 3, minimumQuantity: 3 })).toBe("LOW");
    expect(stockState({ quantity: 2, minimumQuantity: 5 })).toBe("LOW");
    expect(stockState({ quantity: 4, minimumQuantity: 3 })).toBe("OK");
    expect(stockState({ quantity: 1, minimumQuantity: 0 })).toBe("OK");
  });

  it("computes movement deltas by type", () => {
    expect(movementDelta({ type: "IN", quantity: 5 })).toBe(5);
    expect(movementDelta({ type: "OUT", quantity: 5 })).toBe(-5);
    expect(movementDelta({ type: "ADJUSTMENT", quantity: -2 })).toBe(-2);
  });
});
