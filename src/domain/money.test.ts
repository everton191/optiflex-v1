import { describe, expect, it } from "vitest";
import { fromCents, isMoney, requireMoney, roundMoney, toCents } from "./money";
import { itemsTotal, itemsTotalCents, type SaleItem } from "./sales";
import { cashTotals, paidCents, type CashEntry } from "./cash";

const item = (unitPrice: number, quantity = 1): SaleItem => ({
  inventoryItemId: `item-${unitPrice}-${quantity}`,
  name: `Produto ${unitPrice}`,
  quantity,
  unitPrice,
});

const entry = (amount: number, type: CashEntry["type"] = "RECEIPT", saleId?: string): CashEntry => ({
  id: `cash-entry-${amount}-${type}`,
  sessionId: "cash-session-1",
  storeId: "store-1",
  saleId,
  type,
  amount,
  createdAt: new Date().toISOString(),
});

describe("regra de dinheiro (F1-09)", () => {
  it("converte reais em centavos inteiros com arredondamento meio para cima", () => {
    expect(toCents(0.1) + toCents(0.2)).toBe(30);
    expect(fromCents(toCents(0.1 + 0.2))).toBe(0.3);
    expect(toCents(49.9)).toBe(4990);
    expect(toCents(1.125)).toBe(113);
  });

  it("rejeita NaN e Infinity na conversão", () => {
    expect(() => toCents(Number.NaN)).toThrow("Valor monetário inválido.");
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow("Valor monetário inválido.");
    expect(() => fromCents(Number.NaN)).toThrow("Centavos inválidos.");
    expect(() => fromCents(10.5)).toThrow("Centavos inválidos.");
  });

  it("requireMoney só aceita valores finitos e devolve a mensagem do serviço", () => {
    expect(requireMoney(12.34, "Mensagem")).toBe(12.34);
    expect(requireMoney(0, "Mensagem")).toBe(0);
    expect(() => requireMoney(Number.NaN, "Mensagem")).toThrow("Mensagem");
    expect(() => requireMoney(Number.NEGATIVE_INFINITY, "Mensagem")).toThrow("Mensagem");
  });

  it("isMoney distingue finitos de NaN/Infinity", () => {
    expect(isMoney(0.01)).toBe(true);
    expect(isMoney(Number.NaN)).toBe(false);
    expect(isMoney(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("roundMoney é idempotente sobre o valor arredondado", () => {
    expect(toCents(roundMoney(109.8))).toBe(toCents(109.8));
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});

describe("soma de itens em centavos", () => {
  it("soma linhas arredondadas sem erro de ponto flutuante (0.1 + 0.2)", () => {
    const items = [item(0.1), item(0.2), item(0.3)];
    expect(itemsTotalCents(items)).toBe(60);
    expect(itemsTotal(items)).toBe(0.6);
  });

  it("calcula linha com quantidade a partir do preço unitário em centavos", () => {
    const items = [item(49.9, 2), item(10, 1)];
    expect(itemsTotalCents(items)).toBe(10980);
    expect(itemsTotal(items)).toBe(109.8);
  });

  it("propaga erro de valor não finito em vez de gravar NaN", () => {
    expect(() => itemsTotalCents([item(Number.NaN)])).toThrow("Valor monetário inválido.");
    expect(() => itemsTotalCents([item(Number.POSITIVE_INFINITY)])).toThrow("Valor monetário inválido.");
    expect(() => itemsTotal([item(1, Number.NaN)])).toThrow("Valor monetário inválido.");
  });
});

describe("totais de caixa em centavos", () => {
  it("soma recebimentos, suprimentos e sangrias exatamente em centavos", () => {
    const totals = cashTotals(0.05, [
      entry(0.1, "RECEIPT"),
      entry(0.2, "RECEIPT"),
      entry(0.03, "DEPOSIT"),
      entry(0.02, "WITHDRAWAL"),
    ]);
    expect(totals.receipts).toBe(0.3);
    expect(totals.deposits).toBe(0.03);
    expect(totals.withdrawals).toBe(0.02);
    expect(totals.expected).toBe(0.36);
  });

  it("paidCents devolve centavos inteiros exatos", () => {
    const entries = [
      entry(0.1, "RECEIPT", "sale-1"),
      entry(0.2, "RECEIPT", "sale-1"),
      entry(0.1, "RECEIPT", "sale-2"),
      entry(0.1, "WITHDRAWAL", "sale-1"),
    ];
    expect(paidCents(entries, "sale-1")).toBe(30);
    expect(paidCents(entries, "sale-2")).toBe(10);
  });
});
