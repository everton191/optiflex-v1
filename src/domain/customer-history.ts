import { hasPermission, type RoleKey } from "./access";
import { attendanceStatusLabels, attendanceTypeLabels, type Attendance } from "./customer";
import { paymentMethodLabels, type CashEntry } from "./cash";
import type { Sale, SalePaymentStatus, SaleStatus } from "./sales";
import { workOrderStatusLabels, type WorkOrder } from "./work-order";

export type CustomerHistoryKind = "ATTENDANCE" | "SALE" | "WORK_ORDER" | "PAYMENT";

export const customerHistoryKinds: readonly CustomerHistoryKind[] = ["ATTENDANCE", "SALE", "WORK_ORDER", "PAYMENT"];

export const customerHistoryKindLabels: Record<CustomerHistoryKind, string> = {
  ATTENDANCE: "Atendimento",
  SALE: "Venda",
  WORK_ORDER: "Ordem de serviço",
  PAYMENT: "Pagamento"
};

const saleStatusLabels: Record<SaleStatus, string> = { QUOTE: "Orçamento", CONFIRMED: "Confirmada", CANCELLED: "Cancelada" };
const salePaymentStatusLabels: Record<SalePaymentStatus, string> = { PENDING: "Pendente", PARTIAL: "Parcial", PAID: "Recebida" };
const cashEntryTypeLabels: Record<CashEntry["type"], string> = { RECEIPT: "Recebimento", WITHDRAWAL: "Sangria", DEPOSIT: "Suprimento", REFUND: "Estorno" };

export interface CustomerHistoryEvent {
  id: string;
  kind: CustomerHistoryKind;
  at: string;
  title: string;
  detail?: string;
  href?: string;
  storeId: string;
  otherStore: boolean;
}

export interface CustomerHistoryInput {
  attendances: readonly Attendance[];
  sales: readonly Sale[];
  workOrders: readonly WorkOrder[];
  payments: readonly CashEntry[];
}

export interface CustomerHistoryOptions {
  role: RoleKey;
  currentStoreId?: string;
  kinds?: readonly CustomerHistoryKind[];
}

export function historyKindsFor(role: RoleKey): readonly CustomerHistoryKind[] {
  const kinds: CustomerHistoryKind[] = [];
  if (hasPermission(role, "attendance.read")) kinds.push("ATTENDANCE");
  if (hasPermission(role, "sales.read")) kinds.push("SALE", "WORK_ORDER");
  if (hasPermission(role, "cash.read")) kinds.push("PAYMENT");
  return kinds;
}

function money(value: number): string { return `R$ ${value.toFixed(2)}`; }

export function buildCustomerHistory(input: CustomerHistoryInput, options: CustomerHistoryOptions): CustomerHistoryEvent[] {
  const allowed = new Set(options.kinds ?? historyKindsFor(options.role));
  const events: CustomerHistoryEvent[] = [];
  const otherStore = (storeId: string) => Boolean(options.currentStoreId) && storeId !== options.currentStoreId;
  if (allowed.has("ATTENDANCE")) {
    const canClinical = hasPermission(options.role, "clinical.workspace.access");
    for (const item of input.attendances) {
      const clinical = canClinical && item.status !== "CANCELLED" && !otherStore(item.storeId);
      events.push({
        id: `attendance-${item.id}`,
        kind: "ATTENDANCE",
        at: item.createdAt,
        title: attendanceTypeLabels[item.type],
        detail: attendanceStatusLabels[item.status],
        href: clinical ? `/clinico/atendimento/${item.id}` : hasPermission(options.role, "attendance.read") ? `/atendimentos/${item.id}` : undefined,
        storeId: item.storeId,
        otherStore: otherStore(item.storeId)
      });
    }
  }
  if (allowed.has("SALE")) {
    for (const sale of input.sales) {
      events.push({
        id: `sale-${sale.id}`,
        kind: "SALE",
        at: sale.createdAt,
        title: sale.description,
        detail: `${saleStatusLabels[sale.status]}${sale.paymentStatus ? ` · ${salePaymentStatusLabels[sale.paymentStatus]}` : ""} · ${money(sale.total)}`,
        href: `/vendas/${sale.id}`,
        storeId: sale.storeId,
        otherStore: otherStore(sale.storeId)
      });
    }
  }
  if (allowed.has("WORK_ORDER")) {
    for (const order of input.workOrders) {
      events.push({
        id: `work-order-${order.id}`,
        kind: "WORK_ORDER",
        at: order.updatedAt ?? order.createdAt,
        title: "Ordem de serviço",
        detail: workOrderStatusLabels[order.status],
        href: `/ordens-servico/${order.id}`,
        storeId: order.storeId,
        otherStore: otherStore(order.storeId)
      });
    }
  }
  if (allowed.has("PAYMENT")) {
    for (const entry of input.payments) {
      events.push({
        id: `payment-${entry.id}`,
        kind: "PAYMENT",
        at: entry.createdAt,
        title: cashEntryTypeLabels[entry.type],
        detail: `${money(entry.amount)}${entry.paymentMethod ? ` · ${paymentMethodLabels[entry.paymentMethod]}` : ""}`,
        href: entry.saleId ? `/vendas/${entry.saleId}` : undefined,
        storeId: entry.storeId,
        otherStore: otherStore(entry.storeId)
      });
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
}
