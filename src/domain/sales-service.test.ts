import { beforeEach, describe, expect, it, vi } from "vitest";
import { SalesService } from "./sales-service";
import type { Sale, SaleItem } from "./sales";

const repository = { listByStore: vi.fn(), get: vi.fn(), save: vi.fn(), confirm: vi.fn() };
const service = new SalesService(repository);
const item = (inventoryItemId: string, quantity: number, unitPrice: number): SaleItem => ({ inventoryItemId, name: `Produto ${inventoryItemId}`, quantity, unitPrice });
const quote = (overrides: Partial<Sale> = {}): Sale => ({ id: "sale-1", customerId: "customer-1", storeId: "store-centro", status: "QUOTE", paymentStatus: "PENDING", description: "Armação", total: 300, createdAt: "2026-01-01T10:00:00.000Z", ...overrides });
beforeEach(() => { vi.resetAllMocks(); });

describe("quote creation with stock items", () => {
  it("rejects blank descriptions and invalid totals when there are no items", async () => {
    await expect(service.createQuote("customer-1", "store-centro", "  ", 0)).rejects.toThrow("descrição e valor");
    await expect(service.createQuote("customer-1", "store-centro", "Venda", -5)).rejects.toThrow("descrição e valor");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("validates every item before saving", async () => {
    await expect(service.createQuote("c", "s", "", 0, [item("i1", 0, 10)])).rejects.toThrow("quantidade");
    await expect(service.createQuote("c", "s", "", 0, [item("i1", 1, -1)])).rejects.toThrow("preço");
    await expect(service.createQuote("c", "s", "", 0, [item("", 1, 10)])).rejects.toThrow("produto do estoque");
    await expect(service.createQuote("c", "s", "", 0, [item("i1", 1, 10), item("i1", 2, 10)])).rejects.toThrow("repetido");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("computes total and description from the items", async () => {
    repository.save.mockResolvedValue(undefined);
    const created = await service.createQuote("customer-1", "store-centro", "", 0, [item("i1", 2, 49.9), item("i2", 1, 10)]);
    expect(created.total).toBe(109.8);
    expect(created.description).toBe("Produto i1, Produto i2");
    expect(created.items).toHaveLength(2);
    expect(repository.save).toHaveBeenCalledOnce();
  });

  it("keeps the manual total when the sale has no items", async () => {
    repository.save.mockResolvedValue(undefined);
    const created = await service.createQuote("customer-1", "store-centro", "Serviço", 150);
    expect(created).toMatchObject({ total: 150, description: "Serviço", items: undefined });
  });
});

describe("confirmation with stock deduction", () => {
  it("builds one outgoing movement per item", async () => {
    repository.confirm.mockResolvedValue(undefined);
    const confirmed = await service.confirm(quote({ items: [item("i1", 2, 50)] }));
    expect(confirmed.status).toBe("CONFIRMED");
    expect(repository.confirm).toHaveBeenCalledOnce();
    const [passedSale, movements] = repository.confirm.mock.calls[0];
    expect(passedSale).toMatchObject({ id: "sale-1", status: "CONFIRMED" });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ itemId: "i1", storeId: "store-centro", type: "OUT", quantity: 2, reason: "Venda: Armação" });
    expect(movements[0].id).toMatch(/^movement-/);
    expect(movements[0].createdAt).toBeTruthy();
  });

  it("confirms a service sale without stock movements", async () => {
    repository.confirm.mockResolvedValue(undefined);
    const confirmed = await service.confirm(quote());
    expect(confirmed.status).toBe("CONFIRMED");
    expect(repository.confirm.mock.calls[0][1]).toEqual([]);
  });

  it("rejects sales that are not pending quotes", async () => {
    await expect(service.confirm(quote({ status: "CONFIRMED" }))).rejects.toThrow("pendentes");
    await expect(service.confirm(quote({ status: "CANCELLED" }))).rejects.toThrow("pendentes");
    expect(repository.confirm).not.toHaveBeenCalled();
  });
});
