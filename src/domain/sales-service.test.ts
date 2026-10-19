import { beforeEach, describe, expect, it, vi } from "vitest";
import { SalesService } from "./sales-service";
import { AuditService } from "./audit-service";
import type { InventoryRepository } from "./repositories";
import type { Sale, SaleItem, SalePrescription } from "./sales";

const repository = { listByStore: vi.fn(), get: vi.fn(), save: vi.fn(), confirm: vi.fn(), cancel: vi.fn() };
const inventoryStub: InventoryRepository = {
  listByStore: vi.fn(async () => []),
  listMovements: vi.fn(async () => []),
  createItem: vi.fn(async () => {}),
  createMany: vi.fn(async () => {}),
  updateItem: vi.fn(async () => {}),
  applyMovement: vi.fn(async () => { throw new Error("unused"); }),
  applyReservation: vi.fn(async (itemId: string, storeId: string) => ({ id: itemId, storeId, name: "Produto", quantity: 99, minimumQuantity: 0 }))
};
const service = new SalesService(repository, undefined, undefined, inventoryStub);
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

  it("rejects non-finite totals (NaN and Infinity)", async () => {
    await expect(service.createQuote("customer-1", "store-centro", "Venda", Number.NaN)).rejects.toThrow("descrição e valor");
    await expect(service.createQuote("customer-1", "store-centro", "Venda", Number.POSITIVE_INFINITY)).rejects.toThrow("descrição e valor");
    await expect(service.createQuote("customer-1", "store-centro", "Venda", Number.NEGATIVE_INFINITY)).rejects.toThrow("descrição e valor");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("sums item lines in cents so 0.1 + 0.2 never drifts", async () => {
    repository.save.mockResolvedValue(undefined);
    const created = await service.createQuote("customer-1", "store-centro", "", 0, [item("i1", 1, 0.1), item("i2", 1, 0.2)]);
    expect(created.total).toBe(0.3);
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

  it("rejects non-finite or non-positive values before confirming", async () => {
    await expect(service.confirm(quote({ total: Number.NaN }))).rejects.toThrow("Valores da venda inválidos");
    await expect(service.confirm(quote({ total: Number.POSITIVE_INFINITY }))).rejects.toThrow("Valores da venda inválidos");
    await expect(service.confirm(quote({ total: 0 }))).rejects.toThrow("Valores da venda inválidos");
    await expect(service.confirm(quote({ items: [item("i1", Number.NaN, 10)] }))).rejects.toThrow("Valores da venda inválidos");
    await expect(service.confirm(quote({ items: [item("i1", -1, 10)] }))).rejects.toThrow("Valores da venda inválidos");
    await expect(service.confirm(quote({ items: [item("i1", 1, Number.NaN)] }))).rejects.toThrow("Valores da venda inválidos");
    expect(repository.confirm).not.toHaveBeenCalled();
  });
});

describe("sale cancellation", () => {
  it("requires a reason and rejects already cancelled sales", async () => {
    await expect(service.cancel(quote(), "  ")).rejects.toThrow("Informe o motivo do cancelamento.");
    await expect(service.cancel(quote({ status: "CANCELLED" }), "Desistiu")).rejects.toThrow("já foi cancelada");
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.cancel).not.toHaveBeenCalled();
  });

  it("cancels a quote without stock or cash movements", async () => {
    repository.save.mockResolvedValue(undefined);
    const cancelled = await service.cancel(quote(), "Desistiu", "Ana");
    expect(cancelled).toMatchObject({ status: "CANCELLED", cancelReason: "Desistiu", cancelledBy: "Ana" });
    expect(cancelled.cancelledAt).toBeTruthy();
    expect(repository.save).toHaveBeenCalledOnce();
    expect(repository.cancel).not.toHaveBeenCalled();
  });

  it("cancels a confirmed sale with incoming movements for the repository", async () => {
    repository.cancel.mockResolvedValue(undefined);
    const cancelled = await service.cancel(quote({ status: "CONFIRMED", items: [item("i1", 2, 50)] }), "Cliente devolveu", "Bia");
    expect(cancelled.status).toBe("CANCELLED");
    expect(repository.cancel).toHaveBeenCalledOnce();
    const [passedSale, movements] = repository.cancel.mock.calls[0];
    expect(passedSale).toMatchObject({ status: "CANCELLED", cancelReason: "Cliente devolveu", cancelledBy: "Bia" });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ itemId: "i1", storeId: "store-centro", type: "IN", quantity: 2, reason: "Estorno: Armação" });
  });

  it("cancels a paid service sale without stock movements", async () => {
    repository.cancel.mockResolvedValue(undefined);
    const cancelled = await service.cancel(quote({ status: "CONFIRMED" }), "Erro no valor");
    expect(cancelled.paymentStatus).toBe("PENDING");
    expect(repository.cancel.mock.calls[0][1]).toEqual([]);
  });
});

describe("quote negotiation lifecycle", () => {
  it("walks a draft through sent, accepted, rejected and expired states", async () => {
    repository.save.mockResolvedValue(undefined);
    const sent = await service.transitionQuote(quote(), "SENT");
    expect(sent).toMatchObject({ status: "QUOTE", quoteStatus: "SENT" });
    const accepted = await service.transitionQuote(sent, "ACCEPTED");
    expect(accepted.quoteStatus).toBe("ACCEPTED");
    const rejected = await service.transitionQuote({ ...sent, id: "sale-2" }, "REJECTED");
    expect(rejected.quoteStatus).toBe("REJECTED");
    const expired = await service.transitionQuote({ ...sent, id: "sale-3" }, "EXPIRED");
    expect(expired.quoteStatus).toBe("EXPIRED");
    expect(repository.save).toHaveBeenCalledTimes(4);
  });

  it("rejects transitions the current state does not allow without saving", async () => {
    await expect(service.transitionQuote(quote({ quoteStatus: "ACCEPTED" }), "SENT")).rejects.toThrow("não permite essa mudança");
    await expect(service.transitionQuote(quote({ quoteStatus: "REJECTED" }), "ACCEPTED")).rejects.toThrow("não permite essa mudança");
    await expect(service.transitionQuote(quote({ quoteStatus: "EXPIRED" }), "SENT")).rejects.toThrow("não permite essa mudança");
    await expect(service.transitionQuote(quote({ quoteStatus: "SENT" }), "DRAFT")).rejects.toThrow("não permite essa mudança");
    await expect(service.transitionQuote(quote({ status: "CONFIRMED" }), "SENT")).rejects.toThrow("Somente orçamentos");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("blocks confirmation of rejected or expired quotes and keeps drafts confirmable", async () => {
    repository.confirm.mockResolvedValue(undefined);
    await expect(service.confirm(quote({ quoteStatus: "ACCEPTED" }))).resolves.toMatchObject({ status: "CONFIRMED" });
    await expect(service.confirm(quote({ quoteStatus: "REJECTED" }))).rejects.toThrow("recusado ou expirado");
    await expect(service.confirm(quote({ quoteStatus: "EXPIRED" }))).rejects.toThrow("recusado ou expirado");
    expect(repository.confirm).toHaveBeenCalledOnce();
  });
});

describe("draft quote editing", () => {
  it("revalidates, recalculates the total from items and keeps identity", async () => {
    repository.save.mockResolvedValue(undefined);
    const updated = await service.updateQuote(quote(), { customerId: "customer-2", description: "  ", total: 0, items: [item("i1", 3, 100)] });
    expect(updated).toMatchObject({ id: "sale-1", createdAt: "2026-01-01T10:00:00.000Z", status: "QUOTE", customerId: "customer-2", description: "Produto i1", total: 300 });
    expect(repository.save).toHaveBeenCalledOnce();
  });

  it("keeps the manual total when the draft has no items", async () => {
    repository.save.mockResolvedValue(undefined);
    const updated = await service.updateQuote(quote(), { customerId: "customer-1", description: "Serviço", total: 150, items: [] });
    expect(updated).toMatchObject({ description: "Serviço", total: 150, items: undefined });
  });

  it("rejects edits to quotes that are not drafts and invalid values", async () => {
    await expect(service.updateQuote(quote({ quoteStatus: "SENT" }), { customerId: "customer-1", description: "Novo", total: 10, items: [] })).rejects.toThrow("Apenas rascunhos");
    await expect(service.updateQuote(quote({ status: "CONFIRMED" }), { customerId: "customer-1", description: "Novo", total: 10, items: [] })).rejects.toThrow("Somente orçamentos");
    await expect(service.updateQuote(quote(), { customerId: "customer-1", description: "   ", total: 0, items: [] })).rejects.toThrow("descrição e valor");
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe("prescription handoff", () => {
  const rx = (overrides: Partial<SalePrescription> = {}): SalePrescription => ({ prescriptionId: "rx-1", customerId: "customer-1", version: 2, usage: "DISTANCE", od: { sphere: -1.5, cylinder: -0.75, axis: 95 }, oe: { sphere: -1, cylinder: -0.25, axis: 85, add: 0.5 }, notes: "Grau conferido", ...overrides });
  const prescriptions = { listByCustomer: vi.fn(), listByAttendance: vi.fn(), get: vi.fn(), save: vi.fn() };

  it("stores the snapshot on the quote so the sale never asks for the degrees again", async () => {
    repository.save.mockResolvedValue(undefined);
    const created = await service.createQuote("customer-1", "store-centro", "Armação + lentes", 480, [], rx());
    expect(created.prescription).toMatchObject({ prescriptionId: "rx-1", customerId: "customer-1", version: 2, usage: "DISTANCE" });
    expect(created.prescription?.od).toEqual({ sphere: -1.5, cylinder: -0.75, axis: 95 });
    expect(repository.save).toHaveBeenCalledOnce();
  });

  it("carries the mounting measures through the snapshot and rejects invalid ones", async () => {
    repository.save.mockResolvedValue(undefined);
    const created = await service.createQuote("customer-1", "store-centro", "Armação + lentes", 480, [], rx({ measures: { dpTotal: 64, heightOd: 22, origin: "MEASURED" } }));
    expect(created.prescription?.measures).toEqual({ dpTotal: 64, heightOd: 22, origin: "MEASURED" });
    await expect(service.createQuote("customer-1", "store-centro", "Venda", 100, [], rx({ measures: { dpTotal: -1 } }))).rejects.toThrow("Medida de montagem inválida");
  });

  it("rejects snapshots from another customer or with invalid version, usage or degrees", async () => {
    await expect(service.createQuote("customer-1", "store-centro", "Venda", 100, [], rx({ customerId: "customer-2" }))).rejects.toThrow("outro cliente");
    await expect(service.createQuote("customer-1", "store-centro", "Venda", 100, [], rx({ version: 0 }))).rejects.toThrow("Versão da prescrição");
    await expect(service.createQuote("customer-1", "store-centro", "Venda", 100, [], rx({ usage: "CORRIDA" as never }))).rejects.toThrow("Tipo de uso inválido");
    await expect(service.createQuote("customer-1", "store-centro", "Venda", 100, [], rx({ od: { axis: 200 } }))).rejects.toThrow("entre 0° e 180°");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("keeps the snapshot while the customer is unchanged and drops it on a customer switch", async () => {
    repository.save.mockResolvedValue(undefined);
    const kept = await service.updateQuote(quote({ prescription: rx() }), { customerId: "customer-1", description: "Armação", total: 200, items: [] });
    expect(kept.prescription?.prescriptionId).toBe("rx-1");
    const cleared = await service.updateQuote(quote({ prescription: rx() }), { customerId: "customer-2", description: "Armação", total: 200, items: [] });
    expect(cleared.prescription).toBeUndefined();
    const replaced = await service.updateQuote(quote({ prescription: rx() }), { customerId: "customer-1", description: "Armação", total: 200, items: [], prescription: rx({ prescriptionId: "rx-9", version: 3 }) });
    expect(replaced.prescription).toMatchObject({ prescriptionId: "rx-9", version: 3 });
  });

  it("exposes the customer's prescriptions when the repository is available", async () => {
    prescriptions.listByCustomer.mockResolvedValue([{ id: "rx-1" }]);
    const withRepo = new SalesService(repository, prescriptions, undefined, inventoryStub);
    await expect(withRepo.listCustomerPrescriptions("customer-1", "store-centro")).resolves.toHaveLength(1);
    expect(prescriptions.listByCustomer).toHaveBeenCalledWith("customer-1", "store-centro");
    await expect(service.listCustomerPrescriptions("customer-1", "store-centro")).rejects.toThrow("indisponível");
  });
});

describe("guided sale: categories and treatments", () => {
  const treatment = (name: string, price: number) => ({ name, price });

  it("carries the product category through the item lines", async () => {
    repository.save.mockResolvedValue(undefined);
    const created = await service.createQuote("customer-1", "store-centro", "", 0, [{ ...item("i1", 1, 100), category: "FRAME" }, { ...item("i2", 2, 120), category: "LENS" }]);
    expect(created.items?.map((entry) => entry.category)).toEqual(["FRAME", "LENS"]);
  });

  it("rejects an invalid category on the item line", async () => {
    await expect(service.createQuote("c", "s", "", 0, [{ ...item("i1", 1, 10), category: "SERVICO" as never }])).rejects.toThrow("Categoria do item inválida");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("adds treatments into the total and the description", async () => {
    repository.save.mockResolvedValue(undefined);
    const created = await service.createQuote("customer-1", "store-centro", "", 0, [item("i1", 1, 200)], undefined, [treatment("Antirreflexo", 80), treatment("Transição", 0)]);
    expect(created.total).toBe(280);
    expect(created.description).toBe("Produto i1, Antirreflexo, Transição");
    expect(created.treatments).toHaveLength(2);
  });

  it("keeps the manual total only when there are no items and no treatments", async () => {
    repository.save.mockResolvedValue(undefined);
    const withService = await service.createQuote("customer-1", "store-centro", "Serviço", 150, [], undefined, []);
    expect(withService).toMatchObject({ total: 150, description: "Serviço", items: undefined, treatments: undefined });
    const withTreatment = await service.createQuote("customer-1", "store-centro", "", 0, [], undefined, [treatment("Aplicação de antirreflexo", 50)]);
    expect(withTreatment).toMatchObject({ total: 50, description: "Aplicação de antirreflexo", items: undefined });
  });

  it("rejects treatments without a name or with invalid prices", async () => {
    await expect(service.createQuote("c", "s", "", 0, [], undefined, [treatment("  ", 10)])).rejects.toThrow("Tratamento sem nome");
    await expect(service.createQuote("c", "s", "", 0, [], undefined, [treatment("Antirreflexo", Number.NaN)])).rejects.toThrow("Preço do tratamento inválido");
    await expect(service.createQuote("c", "s", "", 0, [], undefined, [treatment("Antirreflexo", -1)])).rejects.toThrow("Preço do tratamento inválido");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("confirms a sale with treatments moving only the stock items", async () => {
    repository.confirm.mockResolvedValue(undefined);
    await service.confirm(quote({ items: [item("i1", 1, 200)], treatments: [treatment("Antirreflexo", 80)], total: 280 }));
    const [, movements] = repository.confirm.mock.calls[0];
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ itemId: "i1", type: "OUT", quantity: 1 });
  });

  it("replaces the treatments when the draft is edited", async () => {
    repository.save.mockResolvedValue(undefined);
    const cleared = await service.updateQuote(quote({ treatments: [treatment("Antirreflexo", 80)] }), { customerId: "customer-1", description: "Armação", total: 200, items: [], treatments: [] });
    expect(cleared.treatments).toBeUndefined();
    const replaced = await service.updateQuote(quote(), { customerId: "customer-1", description: "", total: 0, items: [], treatments: [treatment("Polarizado", 120)] });
    expect(replaced.treatments).toMatchObject([{ name: "Polarizado", price: 120 }]);
  });
});

describe("sale cancellation audit", () => {
  const audit = { create: vi.fn(), list: vi.fn() };
  const audited = new SalesService(repository, undefined, new AuditService(audit), inventoryStub);

  it("writes an audit entry when a sale is cancelled", async () => {
    repository.cancel.mockResolvedValue(undefined);
    await audited.cancel(quote({ status: "CONFIRMED" }), "Cliente desistiu", "Ana");
    expect(audit.create).toHaveBeenCalledOnce();
    expect(audit.create.mock.calls[0][0]).toMatchObject({ action: "CANCEL", entity: "sale", entityId: "sale-1", author: "Ana", reason: "Cliente desistiu", summary: "Armação", storeId: "store-centro" });
  });

  it("stays silent when no audit repository is wired", async () => {
    repository.save.mockResolvedValue(undefined);
    await service.cancel(quote(), "Desistiu", "Ana");
    expect(audit.create).not.toHaveBeenCalled();
  });
});
