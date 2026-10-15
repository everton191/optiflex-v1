import { hasPermission, type Permission, type RoleKey } from "./access";
import { isActiveQueueStatus, type Attendance } from "./customer";
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
  return attendances.filter((attendance) => isActiveQueueStatus(attendance.status));
}

export function returnsToday(attendances: readonly Attendance[], now: Date = new Date()): Attendance[] {
  return attendances.filter((attendance) => attendance.type === "RETURN" && isToday(attendance.createdAt, now));
}

export type DashboardProfile = "CLINICAL" | "SALES" | "CASH" | "MANAGEMENT";
export type DashboardMetricKey = "sales" | "cash" | "queue" | "returns" | "orders" | "inventory";

const metricPreference: Record<DashboardProfile, readonly DashboardMetricKey[]> = {
  CLINICAL: ["queue", "returns", "inventory"],
  SALES: ["sales", "orders", "cash"],
  CASH: ["cash", "sales", "orders"],
  MANAGEMENT: ["sales", "cash", "queue", "orders", "inventory"],
};

const metricPermissions: Record<DashboardMetricKey, Permission> = {
  sales: "sales.read",
  cash: "cash.read",
  queue: "attendance.queue.read",
  returns: "clinical.workspace.access",
  orders: "sales.read",
  inventory: "inventory.read",
};

export function dashboardProfile(role: RoleKey): DashboardProfile {
  if (role === "CLINICAL_PROFESSIONAL") return "CLINICAL";
  if (role === "SELLER") return "SALES";
  if (role === "CASHIER") return "CASH";
  return "MANAGEMENT";
}

export function dashboardMetricKeys(role: RoleKey): DashboardMetricKey[] {
  return metricPreference[dashboardProfile(role)]
    .filter((key) => hasPermission(role, metricPermissions[key]))
    .slice(0, 4);
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

export function isOverdueOrder(order: WorkOrder, now: Date = new Date()): boolean {
  if (!order.dueAt) return false;
  const due = Date.parse(order.dueAt);
  if (!Number.isFinite(due)) return false;
  return due < now.getTime() && order.status !== "DELIVERED" && order.status !== "CANCELLED";
}

export function overdueOrders(orders: readonly WorkOrder[], now: Date = new Date()): WorkOrder[] {
  return orders.filter((order) => isOverdueOrder(order, now));
}
