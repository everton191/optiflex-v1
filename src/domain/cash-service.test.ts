import { beforeEach, describe, expect, it, vi } from "vitest";
import { CashService } from "./cash-service";
import { cashTotals, receiptPlan } from "./cash";
import type { CashEntry, CashSession } from "./cash";
import type { Sale } from "./sales";

const repository = { current: vi.fn(), listSessions: vi.fn(), listEntries: vi.fn(), openSession: vi.fn(), recordReceipt: vi.fn(), recordMovement: vi.fn(), closeSession: vi.fn() };
const sales = { get: vi.fn(), listByStore: vi.fn(), save: vi.fn(), confirm: vi.fn(), cancel: vi.fn() };
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
    await expect(service.receive("store-centro", "sale-1", 0, "CASH")).rejects.toThrow("Informe um valor válido");
    await expect(service.receive("store-centro", "sale-1", -10, "CASH")).rejects.toThrow("Informe um valor válido");
    await expect(service.receive("store-centro", "sale-1", Number.NaN, "CASH")).rejects.toThrow("Informe um valor válido");
    await expect(service.receive("store-centro", "sale-1", Number.POSITIVE_INFINITY, "CASH")).rejects.toThrow("Informe um valor válido");
    await expect(service.receive("store-centro", "sale-1", 0.001, "CASH")).rejects.toThrow("Informe um valor válido");
    await expect(service.receive("store-centro", "sale-1", 10, undefined as never)).rejects.toThrow("Informe a forma de pagamento.");
    expect(repository.recordReceipt).not.toHaveBeenCalled();
    expect(repository.current).not.toHaveBeenCalled();
  });

  it("requires an open cash session", async () => {
    repository.current.mockResolvedValue(undefined);
    await expect(service.receive("store-centro", "sale-1", 100, "CASH")).rejects.toThrow("Abra o caixa antes de registrar recebimentos.");
    expect(repository.recordReceipt).not.toHaveBeenCalled();
  });

  it("accepts only confirmed sales of the same store", async () => {
    repository.current.mockResolvedValue(activeSession);
    sales.get.mockResolvedValue({ ...confirmedSale, storeId: "store-shopping" });
    await expect(service.receive("store-centro", "sale-1", 100, "CASH")).rejects.toThrow("Venda não encontrada nesta loja.");
    sales.get.mockResolvedValue({ ...confirmedSale, status: "QUOTE" });
    await expect(service.receive("store-centro", "sale-1", 100, "CASH")).rejects.toThrow("Somente vendas confirmadas");
    sales.get.mockResolvedValue(undefined);
    await expect(service.receive("store-centro", "missing", 100, "CASH")).rejects.toThrow("Venda não encontrada nesta loja.");
    expect(repository.recordReceipt).not.toHaveBeenCalled();
  });

  it("records the receipt against the open session", async () => {
    repository.current.mockResolvedValue(activeSession);
    sales.get.mockResolvedValue(confirmedSale);
    repository.recordReceipt.mockImplementation(async (entry: CashEntry) => entry);
    const entry = await service.receive("store-centro", "sale-1", 300, "CASH");
    expect(entry).toMatchObject({ sessionId: "cash-1", storeId: "store-centro", saleId: "sale-1", type: "RECEIPT", amount: 300, paymentMethod: "CASH" });
  });

  it("records the chosen payment method and rejects unknown ones", async () => {
    repository.current.mockResolvedValue(activeSession);
    sales.get.mockResolvedValue(confirmedSale);
    repository.recordReceipt.mockImplementation(async (entry: CashEntry) => entry);
    const entry = await service.receive("store-centro", "sale-1", 300, "PIX");
    expect(entry).toMatchObject({ paymentMethod: "PIX" });
    const debit = await service.receive("store-centro", "sale-1", 50, "DEBIT");
    expect(debit).toMatchObject({ paymentMethod: "DEBIT" });
    const credit = await service.receive("store-centro", "sale-1", 20, "CREDIT");
    expect(credit).toMatchObject({ paymentMethod: "CREDIT" });
    await expect(service.receive("store-centro", "sale-1", 10, "DINHEIRO" as never)).rejects.toThrow("Forma de pagamento inválida.");
    await expect(service.receive("store-centro", "sale-1", 10, "BOLETO" as never)).rejects.toThrow("Forma de pagamento inválida.");
    expect(repository.recordReceipt).toHaveBeenCalledTimes(3);
    expect(repository.current).toHaveBeenCalledTimes(3);
  });
});

describe("per-method totals", () => {
  const entry = (overrides: Partial<CashEntry>): CashEntry => ({ id: `cash-entry-${Math.random()}`, sessionId: "cash-1", storeId: "store-centro", type: "RECEIPT", amount: 0, createdAt: "2026-01-01T12:00:00.000Z", ...overrides });

  it("sums receipts by method and counts legacy entries as cash", () => {
    const totals = cashTotals(100, [
      entry({ amount: 50, paymentMethod: "CASH" }),
      entry({ amount: 30, paymentMethod: "PIX" }),
      entry({ amount: 20 }),
      entry({ amount: 40, paymentMethod: "CARD" }),
      entry({ type: "DEPOSIT", amount: 10 }),
      entry({ type: "WITHDRAWAL", amount: 5 })
    ]);
    expect(totals.byMethod).toEqual({ CASH: 70, PIX: 30, CARD: 40, DEBIT: 0, CREDIT: 0 });
    expect(totals.receipts).toBe(140);
    expect(totals.deposits).toBe(10);
    expect(totals.withdrawals).toBe(5);
    expect(totals.expected).toBe(245);
  });

  it("uses cents precision for method totals", () => {
    const totals = cashTotals(0, [entry({ amount: 0.1, paymentMethod: "PIX" }), entry({ amount: 0.2, paymentMethod: "PIX" })]);
    expect(totals.byMethod.PIX).toBe(0.3);
    expect(totals.receipts).toBe(0.3);
  });
});

describe("payment method rules", () => {
  it("computes applied amount and change in cents without rounding drift", () => {
    expect(receiptPlan(100, 80)).toEqual({ appliedCents: 8000, changeCents: 2000 });
    expect(receiptPlan(80.05, 80.05)).toEqual({ appliedCents: 8005, changeCents: 0 });
    expect(receiptPlan(50, 80)).toEqual({ appliedCents: 5000, changeCents: 0 });
    expect(receiptPlan(0.3, 0.1)).toEqual({ appliedCents: 10, changeCents: 20 });
    expect(receiptPlan(0.1 + 0.2, 0.3)).toEqual({ appliedCents: 30, changeCents: 0 });
    expect(receiptPlan(100.1, 80.05)).toEqual({ appliedCents: 8005, changeCents: 2005 });
  });

  it("stores an optional reference only for PIX", async () => {
    repository.current.mockResolvedValue(activeSession);
    sales.get.mockResolvedValue(confirmedSale);
    repository.recordReceipt.mockImplementation(async (entry: CashEntry) => entry);
    const entry = await service.receive("store-centro", "sale-1", 300, "PIX", "  E2E123  ");
    expect(entry).toMatchObject({ paymentMethod: "PIX", reason: "E2E123" });
    const cash = await service.receive("store-centro", "sale-1", 300, "CASH");
    expect(cash.reason).toBeUndefined();
    await expect(service.receive("store-centro", "sale-1", 300, "CASH", "ref")).rejects.toThrow("apenas para PIX");
    await expect(service.receive("store-centro", "sale-1", 300, "DEBIT", "ref")).rejects.toThrow("apenas para PIX");
    expect(repository.recordReceipt).toHaveBeenCalledTimes(2);
  });
});

describe("cash movements", () => {
  it("records a deposit and a withdrawal with reason and author", async () => {
    repository.current.mockResolvedValue(activeSession);
    repository.recordMovement.mockImplementation(async (entry: CashEntry) => entry);
    const deposit = await service.recordMovement("store-centro", "DEPOSIT", 50, "  Troco do banco  ", "  Operadora  ");
    expect(deposit).toMatchObject({ type: "DEPOSIT", amount: 50, reason: "Troco do banco", author: "Operadora", sessionId: "cash-1", storeId: "store-centro" });
    const withdrawal = await service.recordMovement("store-centro", "WITHDRAWAL", 20, "Pagamento fornecedor");
    expect(withdrawal).toMatchObject({ type: "WITHDRAWAL", reason: "Pagamento fornecedor" });
    expect(withdrawal.author).toBeUndefined();
    expect(repository.recordMovement).toHaveBeenCalledTimes(2);
  });

  it("rejects an invalid type, amount, reason or closed session", async () => {
    await expect(service.recordMovement("store-centro", "RECEIPT" as never, 10, "Motivo")).rejects.toThrow("Tipo de movimentação inválido.");
    await expect(service.recordMovement(" ", "WITHDRAWAL", 10, "Motivo")).rejects.toThrow("Selecione uma loja");
    await expect(service.recordMovement("store-centro", "WITHDRAWAL", 0, "Motivo")).rejects.toThrow("Informe um valor válido.");
    await expect(service.recordMovement("store-centro", "WITHDRAWAL", Number.NaN, "Motivo")).rejects.toThrow("Informe um valor válido.");
    await expect(service.recordMovement("store-centro", "WITHDRAWAL", Number.POSITIVE_INFINITY, "Motivo")).rejects.toThrow("Informe um valor válido.");
    await expect(service.recordMovement("store-centro", "WITHDRAWAL", 10, "   ")).rejects.toThrow("Informe o motivo da movimentação.");
    expect(repository.current).not.toHaveBeenCalled();
    repository.current.mockResolvedValue(undefined);
    await expect(service.recordMovement("store-centro", "WITHDRAWAL", 10, "Motivo")).rejects.toThrow("Abra o caixa antes de registrar movimentações.");
    expect(repository.recordMovement).not.toHaveBeenCalled();
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
