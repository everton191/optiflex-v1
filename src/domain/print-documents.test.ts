import { describe, expect, it } from "vitest";
import type { InventoryItem } from "./inventory";
import { productLabelLines } from "./inventory";
import type { CashEntry } from "./cash";
import { receiptSummary } from "./cash";

const item: InventoryItem = {
  id: "i1", storeId: "s1", name: "Armação Retangular", code: "ARM-001", quantity: 12, minimumQuantity: 2,
  defaultPrice: 250, cost: 120, category: "FRAME", brand: "Optiflex", material: "Acetato",
  variantAttributes: { color: "Preto", size: "52" },
};

const entry = (over: Partial<CashEntry>): CashEntry => ({
  id: "e", sessionId: "cs", storeId: "s1", saleId: "sale-1", type: "RECEIPT", amount: 0,
  paymentMethod: "CASH", createdAt: "2026-10-08T10:00:00", ...over,
});

describe("product label lines", () => {
  it("prints code, product, stock and price in the expected order", () => {
    const lines = productLabelLines(item);
    expect(lines[0]).toEqual({ value: "Armação Retangular", strong: true });
    expect(lines).toContainEqual({ value: "Optiflex · Acetato" });
    expect(lines).toContainEqual({ label: "Categoria", value: "Armação" });
    expect(lines).toContainEqual({ value: "Cor Preto · Tamanho 52" });
    expect(lines).toContainEqual({ label: "Código", value: "ARM-001", strong: true });
    expect(lines).toContainEqual({ label: "Preço", value: "R$ 250.00" });
    expect(lines).toContainEqual({ label: "Saldo", value: "12" });
    const codeIndex = lines.findIndex((line) => line.label === "Código");
    const stockIndex = lines.findIndex((line) => line.label === "Saldo");
    expect(codeIndex).toBeGreaterThan(-1);
    expect(stockIndex).toBeGreaterThan(codeIndex);
  });
  it("falls back to a dash code and omits optional lines when the item is sparse", () => {
    const lines = productLabelLines({ id: "i2", storeId: "s1", name: "Lente básica", quantity: 0, minimumQuantity: 1 });
    expect(lines).toContainEqual({ label: "Código", value: "—", strong: true });
    expect(lines).toContainEqual({ label: "Saldo", value: "0" });
    expect(lines.some((line) => line.label === "Preço")).toBe(false);
    expect(lines.some((line) => line.label === "Categoria")).toBe(false);
    expect(lines.some((line) => line.value.includes("·"))).toBe(false);
  });
});

describe("receipt summary", () => {
  it("reports a sale without receipts as NONE with the full amount pending", () => {
    const summary = receiptSummary(180, [entry({ saleId: "other", amount: 50 })], "sale-1");
    expect(summary).toMatchObject({ totalCents: 18000, receivedCents: 0, pendingCents: 18000, status: "NONE", lines: [] });
  });
  it("aggregates multiple receipts by method and reports PAID when covered", () => {
    const summary = receiptSummary(100, [
      entry({ amount: 60, paymentMethod: "PIX", author: "Ana" }),
      entry({ id: "e2", amount: 40, paymentMethod: "CASH" }),
      entry({ id: "e3", saleId: "other", amount: 999 }),
    ], "sale-1");
    expect(summary.status).toBe("PAID");
    expect(summary.receivedCents).toBe(10000);
    expect(summary.pendingCents).toBe(0);
    expect(summary.lines).toEqual([
      { method: "PIX", amount: 60, at: "2026-10-08T10:00:00", author: "Ana" },
      { method: "CASH", amount: 40, at: "2026-10-08T10:00:00", author: undefined },
    ]);
  });
  it("keeps cents precision and reports PARTIAL with the remaining balance", () => {
    const summary = receiptSummary(33.33, [entry({ amount: 10, paymentMethod: "DEBIT" })], "sale-1");
    expect(summary).toMatchObject({ totalCents: 3333, receivedCents: 1000, pendingCents: 2333, status: "PARTIAL" });
  });
  it("clamps the pending amount to zero when receipts exceed the total", () => {
    const summary = receiptSummary(10, [entry({ amount: 15 })], "sale-1");
    expect(summary).toMatchObject({ receivedCents: 1500, pendingCents: 0, status: "PAID" });
  });
});
