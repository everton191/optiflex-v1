import { toCents } from "./money";

export type CashEntryType = "RECEIPT" | "WITHDRAWAL" | "DEPOSIT";

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
  createdAt: string;
}

export interface CashTotals {
  receipts: number;
  deposits: number;
  withdrawals: number;
  expected: number;
}

export function cashTotals(openingBalance: number, entries: readonly CashEntry[]): CashTotals {
  let receipts = 0;
  let deposits = 0;
  let withdrawals = 0;
  for (const entry of entries) {
    const amount = toCents(entry.amount);
    if (entry.type === "RECEIPT") receipts += amount;
    else if (entry.type === "DEPOSIT") deposits += amount;
    else withdrawals += amount;
  }
  return { receipts: receipts / 100, deposits: deposits / 100, withdrawals: withdrawals / 100, expected: (toCents(openingBalance) + receipts + deposits - withdrawals) / 100 };
}

export function paidCents(entries: readonly CashEntry[], saleId: string): number {
  return entries.reduce((total, entry) => entry.saleId === saleId && entry.type === "RECEIPT" ? total + toCents(entry.amount) : total, 0);
}
