import { defaultOrganization } from "./access";

export const transferStatuses = ["REQUESTED", "SEPARATED", "IN_TRANSIT", "RECEIVED", "CANCELLED"] as const;
export type TransferStatus = typeof transferStatuses[number];

export const transferStatusLabels: Record<TransferStatus, string> = {
  REQUESTED: "Solicitada",
  SEPARATED: "Separada",
  IN_TRANSIT: "Em trânsito",
  RECEIVED: "Recebida",
  CANCELLED: "Cancelada"
};

export function isTransferStatus(value: unknown): value is TransferStatus {
  return typeof value === "string" && (transferStatuses as readonly string[]).includes(value);
}

export const transferTransitions: Record<TransferStatus, TransferStatus[]> = {
  REQUESTED: ["SEPARATED", "CANCELLED"],
  SEPARATED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["RECEIVED"],
  RECEIVED: [],
  CANCELLED: []
};

export interface TransferItem {
  inventoryItemId: string;
  name: string;
  quantity: number;
}

export interface Transfer {
  organizationId?: string;
  id: string;
  fromStoreId: string;
  toStoreId: string;
  status: TransferStatus;
  items: TransferItem[];
  note?: string;
  createdBy: string;
  createdAt: string;
  separatedBy?: string;
  separatedAt?: string;
  transitBy?: string;
  transitAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export function assertValidTransferItems(items: readonly TransferItem[]): void {
  if (!items.length) throw new Error("Adicione ao menos um produto à transferência.");
  for (const item of items) {
    if (!item.inventoryItemId?.trim() || !item.name?.trim()) throw new Error("Produto da transferência inválido.");
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error(`Quantidade inválida de "${item.name}".`);
  }
  if (items.some((item, index) => items.findIndex((other) => other.inventoryItemId === item.inventoryItemId) !== index)) throw new Error("Produto repetido na transferência.");
}

export function defaultTransfer(fromStoreId: string, toStoreId: string, items: readonly TransferItem[], createdBy: string, note?: string): Transfer {
  return {
    id: `transfer-${crypto.randomUUID()}`,
    fromStoreId,
    toStoreId,
    status: "REQUESTED",
    items: items.map((item) => ({ inventoryItemId: item.inventoryItemId, name: item.name, quantity: item.quantity })),
    note: note?.trim() || undefined,
    createdBy,
    createdAt: new Date().toISOString(),
    organizationId: defaultOrganization.id
  };
}
