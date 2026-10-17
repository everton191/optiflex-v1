export const auditActions = ["CREATE", "UPDATE", "CANCEL", "ADJUSTMENT"] as const;
export type AuditAction = (typeof auditActions)[number];

export const auditActionLabels: Record<AuditAction, string> = {
  CREATE: "Criação",
  UPDATE: "Alteração",
  CANCEL: "Cancelamento",
  ADJUSTMENT: "Ajuste de estoque",
};

export const auditEntities = ["sale", "inventoryItem", "user", "store"] as const;
export type AuditEntity = (typeof auditEntities)[number];

export const auditEntityLabels: Record<AuditEntity, string> = {
  sale: "Venda",
  inventoryItem: "Item de estoque",
  user: "Usuário",
  store: "Loja",
};

export interface AuditEntry {
  organizationId?: string;
  id: string;
  storeId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  author: string;
  at: string;
  reason?: string;
  summary?: string;
}

export interface AuditRepository {
  create(entry: AuditEntry): Promise<void>;
  list(filter?: AuditListFilter): Promise<AuditEntry[]>;
}

export interface AuditListFilter {
  storeId?: string;
  action?: AuditAction;
  entity?: AuditEntity;
  author?: string;
  limit?: number;
}

export function isAuditAction(value: unknown): value is AuditAction {
  return typeof value === "string" && Object.hasOwn(auditActionLabels, value);
}

export function isAuditEntity(value: unknown): value is AuditEntity {
  return typeof value === "string" && Object.hasOwn(auditEntityLabels, value);
}

export function assertValidAuditEntry(entry: AuditEntry): void {
  if (!entry.id.trim()) throw new Error("Registro de auditoria sem identificador.");
  if (!entry.storeId.trim()) throw new Error("Registro de auditoria sem loja.");
  if (!isAuditAction(entry.action)) throw new Error("Ação de auditoria inválida.");
  if (!isAuditEntity(entry.entity)) throw new Error("Entidade de auditoria inválida.");
  if (!entry.entityId.trim()) throw new Error("Registro de auditoria sem entidade.");
  if (!entry.author.trim()) throw new Error("Registro de auditoria sem autor.");
  if (!Number.isFinite(Date.parse(entry.at))) throw new Error("Registro de auditoria sem data válida.");
  if (entry.reason !== undefined && !entry.reason.trim()) throw new Error("Motivo de auditoria em branco.");
  if (entry.summary !== undefined && typeof entry.summary !== "string") throw new Error("Resumo de auditoria inválido.");
}
