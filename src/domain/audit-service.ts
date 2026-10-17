import { defaultOrganization } from "./access";
import { assertValidAuditEntry, type AuditAction, type AuditEntry, type AuditEntity, type AuditListFilter, type AuditRepository } from "./audit";

export interface AuditInput {
  storeId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  author: string;
  reason?: string;
  summary?: string;
}

// Append-only log of critical changes. The repository must never update or delete rows.
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  async log(input: AuditInput): Promise<AuditEntry> {
    const author = input.author?.trim() || "sistema";
    const entry: AuditEntry = {
      organizationId: defaultOrganization.id,
      id: `audit-${crypto.randomUUID()}`,
      storeId: input.storeId.trim(),
      action: input.action,
      entity: input.entity,
      entityId: input.entityId.trim(),
      author,
      at: new Date().toISOString(),
      reason: input.reason?.trim() || undefined,
      summary: input.summary?.trim() || undefined,
    };
    assertValidAuditEntry(entry);
    await this.repository.create(entry);
    return entry;
  }

  async list(filter: AuditListFilter = {}): Promise<AuditEntry[]> {
    return this.repository.list(filter);
  }
}
