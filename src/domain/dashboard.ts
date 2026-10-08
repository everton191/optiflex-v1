import type { Attendance } from "./customer";
import type { CashEntry } from "./cash";
import type { InventoryItem } from "./inventory";
import { stockState } from "./inventory";
import type { Sale } from "./sales";
import type { WorkOrder } from "./work-order";

export interface DayBucket { key: string; label: string; cents: number; }

const dayKey = (day: Date) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
const weekdayLabels = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function isSameDay(iso: string, day: Date): boolean {
  const value = new Date(iso);
  if (!Number.isFinite(value.getTime())) return false;
  return dayKey(value) === dayKey(day);
}

export function isToday(iso: string, now: Date = new Date()): boolean { return isSameDay(iso, now); }

export function salesTodayCents(sales: readonly Sale[], now: Date = new Date()): number {
  return sales.filter((sale) => sale.status === "CONFIRMED" && isToday(sale.createdAt, now)).reduce((total, sale) => total + Math.round(sale.total * 100), 0);
}

export function pendingQuotes(sales: readonly Sale[]): Sale[] { return sales.filter((sale) => sale.status === "QUOTE"); }

export function receiptsTodayCents(entries: readonly CashEntry[], now: Date = new Date()): number {
  return entries.filter((entry) => entry.type === "RECEIPT" && isToday(entry.createdAt, now)).reduce((total, entry) => total + Math.round(entry.amount * 100), 0);
}

export function waitingQueue(attendances: readonly Attendance[]): Attendance[] {
  return attendances.filter((attendance) => attendance.status === "WAITING" || attendance.status === "IN_PROGRESS");
}

export function salesByDay(sales: readonly Sale[], now: Date = new Date()): DayBucket[] {
  const buckets: DayBucket[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - offset);
    buckets.push({ key: dayKey(day), label: weekdayLabels[day.getDay()], cents: 0 });
  }
  const index = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const sale of sales) {
    if (sale.status !== "CONFIRMED") continue;
    const bucket = index.get(dayKey(new Date(sale.createdAt)));
    if (bucket) bucket.cents += Math.round(sale.total * 100);
  }
  return buckets;
}

export function chartHeights(buckets: readonly DayBucket[]): number[] {
  const max = Math.max(0, ...buckets.map((bucket) => bucket.cents));
  return buckets.map((bucket) => max === 0 ? 0 : Math.max(8, Math.round((bucket.cents / max) * 100)));
}

export function stockAlerts(items: readonly InventoryItem[]): InventoryItem[] { return items.filter((item) => stockState(item) !== "OK"); }

export function openOrders(orders: readonly WorkOrder[]): WorkOrder[] {
  return orders.filter((order) => order.status !== "DELIVERED" && order.status !== "CANCELLED");
}

export function overdueOrders(orders: readonly WorkOrder[], now: Date = new Date()): WorkOrder[] {
  return orders.filter((order) => order.dueAt && Date.parse(order.dueAt) < now.getTime() && order.status !== "DELIVERED" && order.status !== "CANCELLED");
}
