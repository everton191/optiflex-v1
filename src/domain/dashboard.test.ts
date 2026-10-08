import { describe, expect, it } from "vitest";
import type { Attendance } from "./customer";
import type { CashEntry } from "./cash";
import type { Sale } from "./sales";
import type { WorkOrder } from "./work-order";
import { chartHeights, isToday, openOrders, overdueOrders, pendingQuotes, receiptsTodayCents, salesByDay, salesTodayCents, stockAlerts, waitingQueue } from "./dashboard";

const local = (year: number, month: number, day: number, hour = 12) => new Date(year, month - 1, day, hour).toISOString();
const now = new Date(2026, 2, 10, 15);
const sale = (id: string, status: Sale["status"], total: number, createdAt: string): Sale => ({ id, customerId: "customer-1", storeId: "store-centro", status, description: "Produto", total, createdAt });
const entry = (type: CashEntry["type"], amount: number, createdAt: string): CashEntry => ({ id: `entry-${type}`, sessionId: "session-1", storeId: "store-centro", type, amount, createdAt });

describe("today metrics", () => {
  it("recognizes today's dates and ignores invalid ones", () => {
    expect(isToday(local(2026, 3, 10, 0), now)).toBe(true);
    expect(isToday(local(2026, 3, 9, 23), now)).toBe(false);
    expect(isToday("data-invalida", now)).toBe(false);
  });

  it("sums only confirmed sales created today", () => {
    const sales = [sale("s1", "CONFIRMED", 100, local(2026, 3, 10, 9)), sale("s2", "CONFIRMED", 50.75, local(2026, 3, 10, 12)), sale("s3", "CONFIRMED", 999, local(2026, 3, 9, 12)), sale("s4", "QUOTE", 40, local(2026, 3, 10, 13))];
    expect(salesTodayCents(sales, now)).toBe(15075);
    expect(pendingQuotes(sales)).toHaveLength(1);
    expect(pendingQuotes(sales)[0].id).toBe("s4");
  });

  it("sums only receipt entries created today", () => {
    const entries = [entry("RECEIPT", 200, local(2026, 3, 10, 10)), entry("RECEIPT", 30.4, local(2026, 3, 10, 14)), entry("RECEIPT", 50, local(2026, 3, 8, 10)), entry("WITHDRAWAL", 90, local(2026, 3, 10, 11))];
    expect(receiptsTodayCents(entries, now)).toBe(23040);
  });
});

describe("queue and alerts", () => {
  const attendance = (id: string, status: Attendance["status"]): Attendance => ({ id, customerId: "customer-1", storeId: "store-centro", type: "CONSULTATION", status, createdAt: local(2026, 3, 10, 9) });
  it("counts only waiting or in-progress attendances", () => {
    const queue = [attendance("a1", "WAITING"), attendance("a2", "IN_PROGRESS"), attendance("a3", "FINISHED"), attendance("a4", "DRAFT")];
    expect(waitingQueue(queue)).toHaveLength(2);
  });

  it("flags stock below the minimum or out of stock", () => {
    const items = [{ id: "i1", storeId: "s", name: "A", quantity: 10, minimumQuantity: 3 }, { id: "i2", storeId: "s", name: "B", quantity: 3, minimumQuantity: 3 }, { id: "i3", storeId: "s", name: "C", quantity: 0, minimumQuantity: 0 }];
    expect(stockAlerts(items).map((item) => item.id)).toEqual(["i2", "i3"]);
  });

  it("keeps only open orders and overdue due dates", () => {
    const orders: WorkOrder[] = [
      { id: "os-1", saleId: "s1", customerId: "c", storeId: "s", status: "OPEN", createdAt: local(2026, 3, 1, 10) },
      { id: "os-2", saleId: "s2", customerId: "c", storeId: "s", status: "IN_PRODUCTION", createdAt: local(2026, 3, 2, 10), dueAt: local(2026, 3, 9, 12) },
      { id: "os-3", saleId: "s3", customerId: "c", storeId: "s", status: "READY", createdAt: local(2026, 3, 3, 10), dueAt: local(2026, 3, 20, 12) },
      { id: "os-4", saleId: "s4", customerId: "c", storeId: "s", status: "DELIVERED", createdAt: local(2026, 3, 4, 10), dueAt: local(2026, 3, 5, 12) },
      { id: "os-5", saleId: "s5", customerId: "c", storeId: "s", status: "CANCELLED", createdAt: local(2026, 3, 5, 10) },
    ];
    expect(openOrders(orders).map((order) => order.id)).toEqual(["os-1", "os-2", "os-3"]);
    expect(overdueOrders(orders, now).map((order) => order.id)).toEqual(["os-2"]);
  });
});

describe("seven day chart", () => {
  it("builds seven buckets with confirmed sales only", () => {
    const sales = [sale("s1", "CONFIRMED", 10, local(2026, 3, 10, 9)), sale("s2", "CONFIRMED", 20, local(2026, 3, 10, 10)), sale("s3", "CONFIRMED", 5, local(2026, 3, 5, 10)), sale("s4", "QUOTE", 50, local(2026, 3, 10, 11))];
    const buckets = salesByDay(sales, now);
    expect(buckets).toHaveLength(7);
    expect(buckets.map((bucket) => bucket.key)).toEqual(["2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"]);
    expect(buckets[6].cents).toBe(3000);
    expect(buckets[1].cents).toBe(500);
    expect(buckets[0].cents).toBe(0);
  });

  it("normalizes bar heights against the best day and keeps a minimum", () => {
    const buckets = salesByDay([sale("s1", "CONFIRMED", 10, local(2026, 3, 10, 9)), sale("s2", "CONFIRMED", 1, local(2026, 3, 9, 9))], now);
    const heights = chartHeights(buckets);
    expect(heights).toHaveLength(7);
    expect(Math.max(...heights)).toBe(100);
    expect(heights[6]).toBe(100);
    expect(heights[5]).toBe(10);
    expect(heights[0]).toBe(8);
    expect(chartHeights(salesByDay([], now))).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});
