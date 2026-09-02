export interface CashSession { id: string; storeId: string; openedAt: string; closedAt?: string; openingBalance: number; }
export interface CashEntry { id: string; sessionId: string; storeId: string; saleId?: string; type: "RECEIPT" | "WITHDRAWAL" | "DEPOSIT"; amount: number; createdAt: string; }
