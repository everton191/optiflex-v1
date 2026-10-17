import { describe, expect, it } from "vitest";
import { buildCustomerHistory, historyKindsFor, type CustomerHistoryInput } from "./customer-history";
import type { Attendance } from "./customer";
import type { Sale } from "./sales";
import type { WorkOrder } from "./work-order";
import type { CashEntry } from "./cash";

const attendance = (overrides: Partial<Attendance> = {}): Attendance => ({ id: "att-1", customerId: "customer-1", storeId: "store-centro", type: "CONSULTATION", status: "FINISHED", createdAt: "2026-10-01T10:00:00.000Z", ...overrides });
const sale = (overrides: Partial<Sale> = {}): Sale => ({ id: "sale-1", customerId: "customer-1", storeId: "store-centro", status: "CONFIRMED", paymentStatus: "PAID", description: "Armação + lente", total: 300, createdAt: "2026-10-02T10:00:00.000Z", ...overrides });
const order = (overrides: Partial<WorkOrder> = {}): WorkOrder => ({ id: "wo-1", saleId: "sale-1", customerId: "customer-1", storeId: "store-centro", status: "DELIVERED", createdAt: "2026-10-03T10:00:00.000Z", updatedAt: "2026-10-05T10:00:00.000Z", ...overrides });
const payment = (overrides: Partial<CashEntry> = {}): CashEntry => ({ id: "cash-1", sessionId: "session-1", storeId: "store-centro", saleId: "sale-1", type: "RECEIPT", amount: 300, paymentMethod: "PIX", createdAt: "2026-10-04T10:00:00.000Z", ...overrides });
const input = (overrides: Partial<CustomerHistoryInput> = {}): CustomerHistoryInput => ({ attendances: [], sales: [], workOrders: [], payments: [], ...overrides });

describe("customer history timeline", () => {
  it("aggregates every source newest first with kind labels and links", () => {
    const events = buildCustomerHistory(input({ attendances: [attendance()], sales: [sale()], workOrders: [order()], payments: [payment()] }), { role: "OWNER", currentStoreId: "store-centro" });
    expect(events.map((event) => event.kind)).toEqual(["WORK_ORDER", "PAYMENT", "SALE", "ATTENDANCE"]);
    expect(events.find((event) => event.kind === "ATTENDANCE")).toMatchObject({ href: "/clinico/atendimento/att-1", detail: "Finalizado", otherStore: false });
    expect(events.find((event) => event.kind === "SALE")).toMatchObject({ href: "/vendas/sale-1", detail: "Confirmada · Recebida · R$ 300.00" });
    expect(events.find((event) => event.kind === "WORK_ORDER")).toMatchObject({ href: "/ordens-servico/wo-1", detail: "Entregue", at: "2026-10-05T10:00:00.000Z" });
    expect(events.find((event) => event.kind === "PAYMENT")).toMatchObject({ href: "/vendas/sale-1", title: "Recebimento", detail: "R$ 300.00 · PIX" });
  });

  it("filters kinds by role so a seller never sees attendances or clinical links", () => {
    expect(historyKindsFor("SELLER")).toEqual(["SALE", "WORK_ORDER", "PAYMENT"]);
    expect(historyKindsFor("RECEPTIONIST")).toEqual(["ATTENDANCE"]);
    const sellerEvents = buildCustomerHistory(input({ attendances: [attendance()], sales: [sale()] }), { role: "SELLER", currentStoreId: "store-centro" });
    expect(sellerEvents.every((event) => event.kind !== "ATTENDANCE")).toBe(true);
    expect(JSON.stringify(sellerEvents)).not.toContain("anamnese");
  });

  it("points clinical users to the consultation only on their own store", () => {
    const own = buildCustomerHistory(input({ attendances: [attendance()] }), { role: "CLINICAL_PROFESSIONAL", currentStoreId: "store-centro" });
    expect(own[0]).toMatchObject({ href: "/clinico/atendimento/att-1", otherStore: false });
    const other = buildCustomerHistory(input({ attendances: [attendance({ storeId: "store-shopping" })] }), { role: "CLINICAL_PROFESSIONAL", currentStoreId: "store-centro" });
    expect(other[0]).toMatchObject({ href: "/atendimentos/att-1", otherStore: true });
  });

  it("honors an explicit kinds filter and never invents clinical content", () => {
    const events = buildCustomerHistory(input({ attendances: [attendance()], sales: [sale({ cancelReason: "Desistiu" })] }), { role: "OWNER", kinds: ["SALE"] });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("SALE");
    expect(Object.keys(events[0])).not.toContain("notes");
    expect(Object.keys(events[0])).not.toContain("anamnesis");
  });
});
