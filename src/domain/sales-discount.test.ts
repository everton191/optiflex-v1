import { beforeEach, describe, expect, it, vi } from "vitest";
import { SalesService } from "./sales-service";
import { canApproveDiscount, discountRequiresApproval, discountWithinAuthority, saleDiscountAmountCents, saleTotalWithDiscount, type Sale } from "./sales";

const repository = { listByStore: vi.fn(), get: vi.fn(), save: vi.fn(), confirm: vi.fn(), cancel: vi.fn() };
const service = new SalesService(repository);
const seller = { appliedBy: "João", role: "SELLER" as const };
const quote = (overrides: Partial<Sale> = {}): Sale => ({ id: "sale-1", customerId: "customer-1", storeId: "store-centro", status: "QUOTE", paymentStatus: "PENDING", description: "Armação", total: 270, createdAt: "2026-01-01T10:00:00.000Z", ...overrides });
beforeEach(() => { vi.resetAllMocks(); });

describe("discount math and authority", () => {
  it("computes percent and amount discounts in cents, clamped to the gross total", () => {
    expect(saleDiscountAmountCents(300, { type: "PERCENT", value: 10 })).toBe(3000);
    expect(saleDiscountAmountCents(300, { type: "AMOUNT", value: 40 })).toBe(4000);
    expect(saleDiscountAmountCents(10, { type: "PERCENT", value: 50 })).toBe(500);
    expect(saleDiscountAmountCents(10, { type: "PERCENT", value: 150 })).toBe(1000);
    expect(saleDiscountAmountCents(100, { type: "AMOUNT", value: 500 })).toBe(10000);
    expect(saleTotalWithDiscount(300, { type: "PERCENT", value: 10 })).toBe(270);
    expect(saleTotalWithDiscount(300)).toBe(300);
  });

  it("applies per-role limits: seller 5%/R$50, manager 15%/R$300, owner 30%/R$1000", () => {
    expect(discountWithinAuthority(300, { type: "PERCENT", value: 5 }, "SELLER")).toBe(true);
    expect(discountWithinAuthority(300, { type: "PERCENT", value: 6 }, "SELLER")).toBe(false);
    expect(discountWithinAuthority(300, { type: "AMOUNT", value: 51 }, "SELLER")).toBe(false);
    expect(discountWithinAuthority(300, { type: "PERCENT", value: 15 }, "STORE_MANAGER")).toBe(true);
    expect(discountWithinAuthority(2000, { type: "PERCENT", value: 30 }, "OWNER")).toBe(true);
    expect(discountWithinAuthority(10000, { type: "PERCENT", value: 30 }, "OWNER")).toBe(false);
    expect(discountWithinAuthority(300, { type: "PERCENT", value: 5 }, "CLINICAL_PROFESSIONAL")).toBe(false);
    expect(discountRequiresApproval(300, { type: "PERCENT", value: 10 }, "SELLER")).toBe(true);
    expect(canApproveDiscount(300, { type: "PERCENT", value: 10 }, "STORE_MANAGER")).toBe(true);
    expect(canApproveDiscount(300, { type: "PERCENT", value: 10 }, "SELLER")).toBe(false);
  });
});

describe("quote with discount", () => {
  it("stores the applied discount with gross base and net total inside the seller limit", async () => {
    repository.save.mockResolvedValue(undefined);
    const created = await service.createQuote("customer-1", "store-centro", "Armação", 300, [], undefined, [], { type: "PERCENT", value: 5 }, { appliedBy: "João", role: "SELLER" });
    expect(created.total).toBe(285);
    expect(created.discount).toMatchObject({ type: "PERCENT", value: 5, grossTotal: 300, appliedBy: "João", appliedByRole: "SELLER" });
    expect(created.discount?.approvedBy).toBeUndefined();
    expect(created.discount?.appliedAt).toBeTruthy();
  });

  it("rejects a discount without the applier context and one that zeroes the sale", async () => {
    await expect(service.createQuote("c", "s", "Venda", 300, [], undefined, [], { type: "PERCENT", value: 5 })).rejects.toThrow("quem está aplicando");
    await expect(service.createQuote("c", "s", "Venda", 300, [], undefined, [], { type: "PERCENT", value: 100 }, seller)).rejects.toThrow("zerar");
    await expect(service.createQuote("c", "s", "Venda", 300, [], undefined, [], { type: "PERCENT", value: -1 }, seller)).rejects.toThrow("maior que zero");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("keeps totals unchanged when there is no discount (regression)", async () => {
    repository.save.mockResolvedValue(undefined);
    const created = await service.createQuote("customer-1", "store-centro", "Serviço", 150);
    expect(created.total).toBe(150);
    expect(created.discount).toBeUndefined();
  });
});

describe("approval flow", () => {
  const pending = () => quote({ discount: { type: "PERCENT", value: 10, grossTotal: 300, appliedBy: "João", appliedByRole: "SELLER", appliedAt: "2026-01-01T10:00:00.000Z" } });

  it("blocks confirmation above the applier limit until a manager approves, then records who approved", async () => {
    await expect(service.confirm(pending())).rejects.toThrow("aguarda aprovação");
    repository.save.mockResolvedValue(undefined);
    const approved = await service.approveDiscount(pending(), "Maria", "STORE_MANAGER");
    expect(approved.discount?.approvedBy).toBe("Maria");
    expect(approved.discount?.approvedAt).toBeTruthy();
    repository.confirm.mockResolvedValue(undefined);
    const confirmed = await service.confirm(approved);
    expect(confirmed.status).toBe("CONFIRMED");
  });

  it("blocks self-approval, insufficient authority and double approval", async () => {
    await expect(service.approveDiscount(pending(), "João", "STORE_MANAGER")).rejects.toThrow("próprio desconto");
    await expect(service.approveDiscount(pending(), "Ana", "SELLER")).rejects.toThrow("acima do limite do seu perfil");
    const once = quote({ discount: { ...pending().discount!, approvedBy: "Maria", approvedAt: "2026-01-01T11:00:00.000Z" } });
    await expect(service.approveDiscount(once, "Carlos", "OWNER")).rejects.toThrow("já foi aprovado");
    await expect(service.approveDiscount(quote(), "Maria", "STORE_MANAGER")).rejects.toThrow("não tem desconto");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("replaces the discount on quote update and clears it when the new input has none", async () => {
    repository.save.mockResolvedValue(undefined);
    const updated = await service.updateQuote(quote({ quoteStatus: "DRAFT" }), { customerId: "customer-1", description: "Armação", total: 300, items: [], discount: { type: "AMOUNT", value: 30 } }, { appliedBy: "João", role: "SELLER" });
    expect(updated.total).toBe(270);
    expect(updated.discount?.approvedBy).toBeUndefined();
    const cleared = await service.updateQuote({ ...updated, quoteStatus: "DRAFT" }, { customerId: "customer-1", description: "Armação", total: 300, items: [] });
    expect(cleared.total).toBe(300);
    expect(cleared.discount).toBeUndefined();
  });
});
