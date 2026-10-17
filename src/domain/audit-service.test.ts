import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditService } from "./audit-service";
import type { AuditEntry } from "./audit";

describe("audit service", () => {
  const repository = { create: vi.fn(), list: vi.fn() };
  const service = new AuditService(repository);

  beforeEach(() => { repository.create.mockReset(); repository.list.mockReset(); repository.create.mockResolvedValue(undefined); });

  it("stamps id, date and organization, trimming the payload", async () => {
    const entry = await service.log({ storeId: " store-centro ", action: "CANCEL", entity: "sale", entityId: " sale-1 ", author: "  Ana  ", reason: " Cliente desistiu ", summary: " Armação " });
    expect(entry.id).toMatch(/^audit-/);
    expect(entry.organizationId).toBe("org-local");
    expect(entry.storeId).toBe("store-centro");
    expect(entry.entityId).toBe("sale-1");
    expect(entry.author).toBe("Ana");
    expect(entry.reason).toBe("Cliente desistiu");
    expect(entry.summary).toBe("Armação");
    expect(Number.isFinite(Date.parse(entry.at))).toBe(true);
    expect(repository.create).toHaveBeenCalledWith(entry);
  });

  it("falls back to the system author and drops blank optional fields", async () => {
    const entry = await service.log({ storeId: "store-centro", action: "ADJUSTMENT", entity: "inventoryItem", entityId: "item-1", author: "", reason: "   ", summary: "" });
    expect(entry.author).toBe("sistema");
    expect(entry.reason).toBeUndefined();
    expect(entry.summary).toBeUndefined();
  });

  it("rejects invalid payloads before touching the repository", async () => {
    await expect(service.log({ storeId: "  ", action: "CANCEL", entity: "sale", entityId: "sale-1", author: "Ana" })).rejects.toThrow("sem loja");
    await expect(service.log({ storeId: "store-centro", action: "CANCEL", entity: "sale", entityId: "   ", author: "Ana" })).rejects.toThrow("sem entidade");
    await expect(service.log({ storeId: "store-centro", action: "DROP" as never, entity: "sale", entityId: "sale-1", author: "Ana" })).rejects.toThrow("Ação de auditoria inválida");
    await expect(service.log({ storeId: "store-centro", action: "CANCEL", entity: "planet" as never, entityId: "sale-1", author: "Ana" })).rejects.toThrow("Entidade de auditoria inválida");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("delegates the filtered listing to the repository", async () => {
    const rows: AuditEntry[] = [];
    repository.list.mockResolvedValue(rows);
    const result = await service.list({ action: "CANCEL", entity: "sale", author: "Ana", limit: 50 });
    expect(result).toBe(rows);
    expect(repository.list).toHaveBeenCalledWith({ action: "CANCEL", entity: "sale", author: "Ana", limit: 50 });
  });
});
