import { toCents } from "./money";

export type CashEntryType = "RECEIPT" | "WITHDRAWAL" | "DEPOSIT" | "REFUND";
export type CashMovementType = Exclude<CashEntryType, "RECEIPT" | "REFUND">;
export type PaymentMethod = "CASH" | "PIX" | "CARD" | "DEBIT" | "CREDIT";

export const paymentMethodLabels: Record<PaymentMethod, string> = { CASH: "Dinheiro", PIX: "PIX", CARD: "Cartão", DEBIT: "Débito", CREDIT: "Crédito" };

export const paymentMethodOptions: readonly PaymentMethod[] = ["CASH", "PIX", "DEBIT", "CREDIT"];

export function assertValidPaymentMethod(method?: string): PaymentMethod | undefined {
  if (method === undefined) return undefined;
  if (method in paymentMethodLabels) return method as PaymentMethod;
  throw new Error("Forma de pagamento inválida.");
}

export interface CashSession {
  id: string;
  storeId: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  expectedBalance?: number;
  closingBalance?: number;
  difference?: number;
  closedBy?: string;
  closingNote?: string;
}

export interface CashEntry {
  id: string;
  sessionId: string;
  storeId: string;
  saleId?: string;
  type: CashEntryType;
  amount: number;
  paymentMethod?: PaymentMethod;
  reason?: string;
  author?: string;
  createdAt: string;
}

export interface CashTotals {
  receipts: number;
  deposits: number;
  withdrawals: number;
  refunds: number;
  expected: number;
  byMethod: Record<PaymentMethod, number>;
}

const emptyMethodTotals = (): Record<PaymentMethod, number> => ({ CASH: 0, PIX: 0, CARD: 0, DEBIT: 0, CREDIT: 0 });

export function cashTotals(openingBalance: number, entries: readonly CashEntry[]): CashTotals {
  let receipts = 0;
  let deposits = 0;
  let withdrawals = 0;
  let refunds = 0;
  const byMethod = emptyMethodTotals();
  for (const entry of entries) {
    const amount = toCents(entry.amount);
    if (entry.type === "RECEIPT") {
      receipts += amount;
      byMethod[entry.paymentMethod ?? "CASH"] += amount;
    }
    else if (entry.type === "DEPOSIT") deposits += amount;
    else if (entry.type === "REFUND") refunds += amount;
    else withdrawals += amount;
  }
  for (const method of Object.keys(byMethod) as PaymentMethod[]) byMethod[method] /= 100;
  return { receipts: receipts / 100, deposits: deposits / 100, withdrawals: withdrawals / 100, refunds: refunds / 100, expected: (toCents(openingBalance) + receipts + deposits - withdrawals - refunds) / 100, byMethod };
}

export function paidCents(entries: readonly CashEntry[], saleId: string): number {
  return entries.reduce((total, entry) => entry.saleId === saleId && entry.type === "RECEIPT" ? total + toCents(entry.amount) : total, 0);
}
