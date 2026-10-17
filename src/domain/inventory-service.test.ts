import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryService } from "./inventory-service";
import { AuditService } from "./audit-service";
import type { InventoryItem } from "./inventory";
import { filterByCategory, marginCents, movementDelta, stockState } from "./inventory";

const repository = { listByStore: vi.fn(), listMovements: vi.fn(), createItem: vi.fn(), updateItem: vi.fn(), applyMovement: vi.fn() };
const service = new InventoryService(repository);
const item: InventoryItem = { id: "item-1", storeId: "store-centro", name: "Armação", quantity: 10, minimumQuantity: 3, category: "FRAME" };
beforeEach(() => { vi.resetAllMocks(); repository.listByStore.mockResolvedValue([]); });

describe("product registration", () => {
  it("rejects an empty store, a blank name and invalid quantities", async () => {
    await expect(service.create("  ", { name: "Armação", quantity: 1, minimumQuantity: 1, category: "FRAME" })).rejects.toThrow("Selecione uma loja");
    await expect(service.create("store-centro", { name: "   ", quantity: 1, minimumQuantity: 1, category: "FRAME" })).rejects.toThrow("Informe o nome do produto");
    await expect(service.create("store-centro", { name: "Armação", quantity: -1, minimumQuantity: 0, category: "FRAME" })).rejects.toThrow("saldo inicial");
    await expect(service.create("store-centro", { name: "Armação", quantity: 0, minimumQuantity: Number.NaN, category: "FRAME" })).rejects.toThrow("estoque mínimo");
    expect(repository.createItem).not.toHaveBeenCalled();
  });

  it("requires a valid catalog category on create", async () => {
    await expect(service.create("store-centro", { name: "Armação", quantity: 1, minimumQuantity: 1 } as never)).rejects.toThrow("Selecione a categoria do produto");
    await expect(service.create("store-centro", { name: "Armação", quantity: 1, minimumQuantity: 1, category: "SHADE" as never })).rejects.toThrow("Selecione a categoria do produto");
    await expect(service.create("store-centro", { name: "Armação", quantity: 1, minimumQuantity: 1, category: undefined as never })).rejects.toThrow("Selecione a categoria do produto");
    expect(repository.createItem).not.toHaveBeenCalled();
  });

  it("creates the product together with the initial stock movement", async () => {
    repository.createItem.mockResolvedValue(undefined);
    const created = await service.create("store-centro", { name: "  Lente 1.67  ", code: "  LT-1  ", quantity: 8, minimumQuantity: 2, category: "LENS" }, "Operador");
    expect(created).toMatchObject({ storeId: "store-centro", name: "Lente 1.67", code: "LT-1", quantity: 8, minimumQuantity: 2, category: "LENS" });
    const [stored, initial] = repository.createItem.mock.calls[0];
    expect(stored).toMatchObject({ name: "Lente 1.67", quantity: 8, category: "LENS" });
    expect(initial).toMatchObject({ itemId: stored.id, type: "IN", quantity: 8, reason: "Estoque inicial", author: "Operador" });
  });

  it("creates an empty product without an initial movement", async () => {
    repository.createItem.mockResolvedValue(undefined);
    const created = await service.create("store-centro", { name: "Armação", code: "AR-0", quantity: 0, minimumQuantity: 0, category: "FRAME" });
    expect(created).toMatchObject({ quantity: 0 });
    expect(repository.createItem.mock.calls[0][1]).toBeUndefined();
  });

  it("requires a code and rejects a blank one", async () => {
    await expect(service.create("store-centro", { name: "Armação", quantity: 1, minimumQuantity: 1, category: "FRAME" })).rejects.toThrow("Informe o código do produto");
    await expect(service.create("store-centro", { name: "Armação", code: "   ", quantity: 1, minimumQuantity: 1, category: "FRAME" })).rejects.toThrow("Informe o código do produto");
    await expect(service.update(item, { name: "Armação", minimumQuantity: 3, category: "FRAME" })).rejects.toThrow("Informe o código do produto");
    expect(repository.createItem).not.toHaveBeenCalled();
    expect(repository.updateItem).not.toHaveBeenCalled();
  });

  it("rejects a duplicated code in the same store, ignoring case", async () => {
    repository.listByStore.mockResolvedValue([{ ...item, id: "item-9", code: "lt-1" }]);
    await expect(service.create("store-centro", { name: "Lente", code: " LT-1 ", quantity: 1, minimumQuantity: 0, category: "LENS" })).rejects.toThrow("Código já cadastrado nesta loja");
    await expect(service.update(item, { name: "Armação", code: "LT-1", minimumQuantity: 3, category: "FRAME" })).rejects.toThrow("Código já cadastrado nesta loja");
    expect(repository.createItem).not.toHaveBeenCalled();
    expect(repository.updateItem).not.toHaveBeenCalled();
  });

  it("keeps the item's own code when editing and accepts a free code", async () => {
    repository.listByStore.mockResolvedValue([{ ...item, code: "AR-1" }]);
    repository.updateItem.mockResolvedValue(undefined);
    const updated = await service.update(item, { name: "Armação", code: "AR-1", minimumQuantity: 3, category: "FRAME" });
    expect(updated).toMatchObject({ code: "AR-1" });
    repository.listByStore.mockResolvedValue([{ ...item, code: "AR-1" }, { id: "item-2", storeId: "store-centro", name: "Lente", code: "LT-9", quantity: 1, minimumQuantity: 0, category: "LENS" }]);
    const changed = await service.update(item, { name: "Armação", code: "LT-10", minimumQuantity: 3, category: "FRAME" });
    expect(changed).toMatchObject({ code: "LT-10" });
    expect(repository.updateItem).toHaveBeenCalledTimes(2);
  });

  it("stores an optional default price and cost without touching the balance", async () => {
    repository.createItem.mockResolvedValue(undefined);
    const created = await service.create("store-centro", { name: "Armação", code: "AR-2", quantity: 2, minimumQuantity: 1, defaultPrice: 250.5, cost: 120, category: "FRAME" });
    expect(created).toMatchObject({ defaultPrice: 250.5, cost: 120, quantity: 2, minimumQuantity: 1 });
  });

  it("stores the product sheet (brand, material, description) trimmed", async () => {
    repository.createItem.mockResolvedValue(undefined);
    const created = await service.create("store-centro", { name: "Armação", code: "AR-3", quantity: 1, minimumQuantity: 0, category: "FRAME", brand: "  Nike  ", material: " Acetato ", description: "  Hipster aro 52  " });
    expect(created).toMatchObject({ category: "FRAME", brand: "Nike", material: "Acetato", description: "Hipster aro 52" });
    const blank = await service.create("store-centro", { name: "Lente", code: "LT-2", quantity: 1, minimumQuantity: 0, category: "LENS", brand: "  ", material: "", description: "" });
    expect(blank.brand).toBeUndefined();
    expect(blank.material).toBeUndefined();
    expect(blank.description).toBeUndefined();
  });

  it("rejects an invalid default price or cost", async () => {
    await expect(service.create("store-centro", { name: "Armação", code: "AR-9", quantity: 1, minimumQuantity: 1, category: "FRAME", defaultPrice: -1 })).rejects.toThrow("preço padrão válido");
    await expect(service.create("store-centro", { name: "Armação", code: "AR-9", quantity: 1, minimumQuantity: 1, category: "FRAME", defaultPrice: Number.POSITIVE_INFINITY })).rejects.toThrow("preço padrão válido");
    await expect(service.create("store-centro", { name: "Armação", code: "AR-9", quantity: 1, minimumQuantity: 1, category: "FRAME", cost: Number.NaN })).rejects.toThrow("custo válido");
    expect(repository.createItem).not.toHaveBeenCalled();
  });
});

describe("product editing", () => {
  it("validates the name and the minimum before writing", async () => {
    await expect(service.update(item, { name: " ", minimumQuantity: 2, category: "FRAME" })).rejects.toThrow("Informe o nome do produto");
    await expect(service.update(item, { name: "Armação", minimumQuantity: -1, category: "FRAME" })).rejects.toThrow("estoque mínimo");
    expect(repository.updateItem).not.toHaveBeenCalled();
  });

  it("requires a valid catalog category on update", async () => {
    await expect(service.update(item, { name: "Armação", minimumQuantity: 3 } as never)).rejects.toThrow("Selecione a categoria do produto");
    await expect(service.update(item, { name: "Armação", minimumQuantity: 3, category: "SHADE" as never })).rejects.toThrow("Selecione a categoria do produto");
    expect(repository.updateItem).not.toHaveBeenCalled();
  });

  it("updates identification, category and sheet without changing the balance", async () => {
    repository.updateItem.mockResolvedValue(undefined);
    const updated = await service.update(item, { name: "  Armação nova  ", code: " AR-1 ", minimumQuantity: 6, category: "ACCESSORY", brand: "Ray-Ban", material: "Metal", description: "Aro 50" });
    expect(updated).toMatchObject({ name: "Armação nova", code: "AR-1", minimumQuantity: 6, quantity: 10, category: "ACCESSORY", brand: "Ray-Ban", material: "Metal", description: "Aro 50" });
    expect(repository.updateItem).toHaveBeenCalledOnce();
  });

  it("updates and clears the optional default price, cost and sheet", async () => {
    repository.updateItem.mockResolvedValue(undefined);
    const updated = await service.update(item, { name: "Armação", code: "AR-1", minimumQuantity: 3, defaultPrice: 99.9, cost: 40, category: "FRAME" });
    expect(updated).toMatchObject({ defaultPrice: 99.9, cost: 40 });
    const cleared = await service.update(updated, { name: "Armação", code: "AR-1", minimumQuantity: 3, category: "FRAME", brand: "", material: "", description: "" });
    expect(cleared.defaultPrice).toBeUndefined();
    expect(cleared.cost).toBeUndefined();
    expect(cleared.brand).toBeUndefined();
    expect(cleared.material).toBeUndefined();
    expect(cleared.description).toBeUndefined();
    await expect(service.update(item, { name: "Armação", code: "AR-1", minimumQuantity: 3, category: "FRAME", defaultPrice: -5 })).rejects.toThrow("preço padrão válido");
    expect(repository.updateItem).toHaveBeenCalledTimes(2);
  });
});

describe("catalog filtering", () => {
  const frame: InventoryItem = { id: "f", storeId: "store-centro", name: "Armação", quantity: 1, minimumQuantity: 0, category: "FRAME" };
  const lens: InventoryItem = { id: "l", storeId: "store-centro", name: "Lente", quantity: 2, minimumQuantity: 0, category: "LENS" };
  const accessory: InventoryItem = { id: "a", storeId: "store-centro", name: "Cabo", quantity: 3, minimumQuantity: 0, category: "ACCESSORY" };
  const legacy: InventoryItem = { id: "g", storeId: "store-centro", name: "Avulso", quantity: 4, minimumQuantity: 0 };

  it("finds products by category and keeps uncategorized stock only under ALL", () => {
    const items = [frame, lens, accessory, legacy];
    expect(filterByCategory(items, "ALL")).toEqual([frame, lens, accessory, legacy]);
    expect(filterByCategory(items, "FRAME")).toEqual([frame]);
    expect(filterByCategory(items, "LENS")).toEqual([lens]);
    expect(filterByCategory(items, "ACCESSORY")).toEqual([accessory]);
    expect(filterByCategory(items, "FRAME")).not.toContain(legacy);
    expect(filterByCategory([], "LENS")).toEqual([]);
  });

  it("returns a copy on ALL so filtering never mutates the loaded list", () => {
    const items = [frame, lens];
    const filtered = filterByCategory(items, "ALL");
    filtered.pop();
    expect(items).toHaveLength(2);
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

  it("treats non-finite balances as out of stock instead of passing the check", () => {
    expect(stockState({ quantity: Number.NaN, minimumQuantity: 0 })).toBe("OUT");
    expect(stockState({ quantity: Number.POSITIVE_INFINITY, minimumQuantity: 3 })).toBe("OUT");
    expect(stockState({ quantity: 2, minimumQuantity: Number.NaN })).toBe("OK");
  });

  it("computes movement deltas by type", () => {
    expect(movementDelta({ type: "IN", quantity: 5 })).toBe(5);
    expect(movementDelta({ type: "OUT", quantity: 5 })).toBe(-5);
    expect(movementDelta({ type: "ADJUSTMENT", quantity: -2 })).toBe(-2);
  });

  it("computes margin in cents without rounding drift", () => {
    expect(marginCents(250.5, 120)).toBe(13050);
    expect(marginCents(80.05, 80.05)).toBe(0);
    expect(marginCents(50, 80)).toBe(-3000);
    expect(marginCents(0.1 + 0.2, 0.1)).toBe(20);
    expect(marginCents(Number.NaN, 10)).toBeUndefined();
    expect(marginCents(10, Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});

describe("adjustment audit", () => {
  const audit = { create: vi.fn(), list: vi.fn() };
  const audited = new InventoryService(repository, new AuditService(audit));

  it("writes an audit entry after applying a movement", async () => {
    repository.applyMovement.mockResolvedValue({ ...item, quantity: 14 });
    await audited.adjust(item, "IN", 4, "Recebimento de nota", "Operador");
    expect(audit.create).toHaveBeenCalledOnce();
    expect(audit.create.mock.calls[0][0]).toMatchObject({ action: "ADJUSTMENT", entity: "inventoryItem", entityId: "item-1", author: "Operador", reason: "Recebimento de nota", summary: "IN 4 un. — Armação", storeId: "store-centro" });
  });
});
