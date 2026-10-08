import { beforeEach, describe, expect, it, vi } from "vitest";
import { CashService } from "./cash-service";
import type { CashEntry, CashSession } from "./cash";
import type { Sale } from "./sales";

const repository = { current: vi.fn(), listSessions: vi.fn(), listEntries: vi.fn(), openSession: vi.fn(), recordReceipt: vi.fn(), closeSession: vi.fn() };
const sales = { get: vi.fn(), listByStore: vi.fn(), save: vi.fn(), confirm: vi.fn() };
const service = new CashService(repository, sales);
const activeSession: CashSession = { id: "cash-1", storeId: "store-centro", openedAt: "2026-01-01T10:00:00.000Z", openingBalance: 100 };
const confirmedSale: Sale = { id: "sale-1", customerId: "customer-1", storeId: "store-centro", status: "CONFIRMED", description: "Armação", total: 300, createdAt: "2026-01-01T11:00:00.000Z" };
beforeEach(() => { vi.resetAllMocks(); });

describe("cash opening", () => {
  it("rejects an empty store and an invalid opening balance", async () => {
    await expect(service.open("  ", 0)).rejects.toThrow("Selecione uma loja");
    await expect(service.open("store-centro", -1)).rejects.toThrow("saldo inicial válido");
    await expect(service.open("store-centro", Number.NaN)).rejects.toThrow("saldo inicial válido");
    await expect(service.open("store-centro", Number.POSITIVE_INFINITY)).rejects.toThrow("saldo inicial válido");
    expect(repository.openSession).not.toHaveBeenCalled();
  });

  it("refuses to open while another session is active", async () => {
    repository.current.mockResolvedValue(activeSession);
    await expect(service.open("store-centro", 50)).rejects.toThrow("Já existe um caixa aberto nesta loja.");
    expect(repository.openSession).not.toHaveBeenCalled();
  });

  it("creates a session for the selected store", async () => {
    repository.current.mockResolvedValue(undefined);
    repository.openSession.mockImplementation(async (value: CashSession) => value);
    const created = await service.open("store-shopping", 50);
    expect(created).toMatchObject({ storeId: "store-shopping", openingBalance: 50 });
    expect(repository.openSession).toHaveBeenCalledOnce();
  });
});

describe("cash receipts", () => {
  it("rejects invalid amounts before touching the session", async () => {
    await expect(service.receive("store-centro", "sale-1", 0)).rejects.toThrow("Informe um valor válido");
    await expect(service.receive("store-centro", "sale-1", -10)).rejects.toThrow("Informe um valor válido");
    await expect(service.receive("store-centro", "sale-1", Number.NaN)).rejects.toThrow("Informe um valor válido");
    await expect(service.receive("store-centro", "sale-1", Number.POSITIVE_INFINITY)).rejects.toThrow("Informe um valor válido");
    await expect(service.receive("store-centro", "sale-1", 0.001)).rejects.toThrow("Informe um valor válido");
    expect(repository.current).not.toHaveBeenCalled();
  });

  it("requires an open cash session", async () => {
    repository.current.mockResolvedValue(undefined);
    await expect(service.receive("store-centro", "sale-1", 100)).rejects.toThrow("Abra o caixa antes de registrar recebimentos.");
    expect(repository.recordReceipt).not.toHaveBeenCalled();
  });

  it("accepts only confirmed sales of the same store", async () => {
    repository.current.mockResolvedValue(activeSession);
    sales.get.mockResolvedValue({ ...confirmedSale, storeId: "store-shopping" });
    await expect(service.receive("store-centro", "sale-1", 100)).rejects.toThrow("Venda não encontrada nesta loja.");
    sales.get.mockResolvedValue({ ...confirmedSale, status: "QUOTE" });
    await expect(service.receive("store-centro", "sale-1", 100)).rejects.toThrow("Somente vendas confirmadas");
    sales.get.mockResolvedValue(undefined);
    await expect(service.receive("store-centro", "missing", 100)).rejects.toThrow("Venda não encontrada nesta loja.");
    expect(repository.recordReceipt).not.toHaveBeenCalled();
  });

  it("records the receipt against the open session", async () => {
    repository.current.mockResolvedValue(activeSession);
    sales.get.mockResolvedValue(confirmedSale);
    repository.recordReceipt.mockImplementation(async (entry: CashEntry) => entry);
    const entry = await service.receive("store-centro", "sale-1", 300);
    expect(entry).toMatchObject({ sessionId: "cash-1", storeId: "store-centro", saleId: "sale-1", type: "RECEIPT", amount: 300 });
  });
});

describe("cash closing", () => {
  it("requires an open cash session and a valid store", async () => {
    repository.current.mockResolvedValue(undefined);
    await expect(service.close("store-centro", 400)).rejects.toThrow("Abra o caixa antes de fechar.");
    await expect(service.close(" ", 400)).rejects.toThrow("Selecione uma loja");
    expect(repository.closeSession).not.toHaveBeenCalled();
  });

  it("rejects an invalid counted amount", async () => {
    repository.current.mockResolvedValue(activeSession);
    await expect(service.close("store-centro", -1)).rejects.toThrow("valor contado");
    await expect(service.close("store-centro", Number.POSITIVE_INFINITY)).rejects.toThrow("valor contado");
    expect(repository.closeSession).not.toHaveBeenCalled();
  });

  it("closes with the counted amount, the responsible person and the note", async () => {
    repository.current.mockResolvedValue(activeSession);
    repository.closeSession.mockImplementation(async (storeId: string, input: { closingBalance: number; closedBy?: string; note?: string }) => ({ ...activeSession, storeId, closedAt: "2026-01-01T18:00:00.000Z", closingBalance: input.closingBalance, closedBy: input.closedBy, closingNote: input.note }));
    const closed = await service.close("store-centro", 415, "Operadora", "conferido");
    expect(repository.closeSession).toHaveBeenCalledWith("store-centro", { closingBalance: 415, closedBy: "Operadora", note: "conferido" });
    expect(closed).toMatchObject({ closedAt: "2026-01-01T18:00:00.000Z", closingBalance: 415 });
  });
});
