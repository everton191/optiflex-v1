import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackupService, validateBackup } from "../../domain/backup";
import { database } from "./database";
import { LocalAdministrationRepository } from "./local-repositories";
import { LocalBackupRepository } from "./local-backup";
import { EncryptedBackupCodec } from "./backup-codec";

const repository = new LocalBackupRepository();
const codec = new EncryptedBackupCodec();
const service = new BackupService(repository, codec);
const password = "Senha-ficticia-teste-123";
beforeEach(async () => { await database.open(); await new LocalAdministrationRepository().initialize(); });
afterEach(async () => { vi.restoreAllMocks(); await database.delete(); });

describe("encrypted backup and transactional restore", () => {
  it("roundtrips data, encrypts contents and does not export sessions", async () => {
    await database.customers.add({ id: "test", name: "Nome confidencial teste", createdAt: new Date().toISOString() });
    await database.sessions.put({ id: "current", userName: "Teste", role: "RECEPTIONIST" });
    await database.attachments.put({ id: "att-1", content: "aGVsbG8=" });
    const encrypted = await service.create(password, "OWNER");
    expect(encrypted).not.toContain("Nome confidencial");
    const snapshot = await service.inspect(encrypted, password, "OWNER");
    expect(snapshot.tables.customers).toHaveLength(1);
    expect(snapshot.tables).not.toHaveProperty("sessions");
    expect(snapshot.tables.attachments).toEqual([{ id: "att-1", content: "aGVsbG8=" }]);
    await database.customers.clear();
    await database.attachments.clear();
    await service.restore(snapshot, "RESTAURAR", "OWNER");
    expect((await database.customers.get("test"))?.name).toBe("Nome confidencial teste");
    expect((await database.sessions.get("current"))?.role).toBe("RECEPTIONIST");
    expect((await database.attachments.get("att-1"))?.content).toBe("aGVsbG8=");
  });
  it("keeps legacy backups readable and rejects corrupted attachment content", async () => {
    const snapshot = await repository.snapshot();
    const legacy = structuredClone(snapshot);
    legacy.schema = 10;
    const legacyTables = legacy as unknown as { tables: Record<string, unknown> };
    delete legacyTables.tables.attachments;
    expect(() => validateBackup(legacy)).not.toThrow();
    expect(validateBackup(legacy).tables.attachments).toEqual([]);
    const schemaTenWithTable = structuredClone(snapshot);
    schemaTenWithTable.schema = 10;
    expect(() => validateBackup(schemaTenWithTable)).toThrow("inválido");
    const missingTable = structuredClone(snapshot);
    const missingTables = missingTable as unknown as { tables: Record<string, unknown> };
    delete missingTables.tables.attachments;
    expect(() => validateBackup(missingTable)).toThrow("inválido");
    const corrupted = structuredClone(snapshot);
    corrupted.tables.attachments.push({ id: "att-bad", content: "conteúdo inválido!" });
    expect(() => validateBackup(corrupted)).toThrow("inválido");
  });
  it("rejects wrong password and altered ciphertext", async () => {
    const encrypted = await service.create(password, "OWNER");
    await expect(service.inspect(encrypted, "Senha-errada", "OWNER")).rejects.toThrow("senha");
    const envelope = JSON.parse(encrypted); envelope.data = (envelope.data[0] === "A" ? "B" : "A") + envelope.data.slice(1);
    await expect(service.inspect(JSON.stringify(envelope), password, "OWNER")).rejects.toThrow("integridade");
  });
  it("requires the owner, a strong-enough password and explicit confirmation", async () => {
    await expect(service.create(password, "NETWORK_ADMINISTRATOR")).rejects.toThrow("proprietário");
    await expect(service.create("123", "OWNER")).rejects.toThrow("12");
    await expect(service.restore(await repository.snapshot(), "", "OWNER")).rejects.toThrow("RESTAURAR");
  });
  it("rejects incompatible files, duplicate IDs and broken links before writing", async () => {
    const snapshot = await repository.snapshot();
    expect(() => validateBackup({ ...snapshot, schema: 999 })).toThrow("inválido");
    const duplicate = structuredClone(snapshot); duplicate.tables.stores.push(duplicate.tables.stores[0]);
    expect(() => validateBackup(duplicate)).toThrow("inválido");
    const broken = structuredClone(snapshot); broken.tables.currentStore[0].storeId = "missing";
    await expect(repository.restore(broken)).rejects.toThrow("inválido");
    expect(await repository.snapshot()).toMatchObject({ tables: snapshot.tables });
  });
  it("rolls back all tables when import fails midway", async () => {
    const original = await repository.snapshot();
    const replacement = structuredClone(original); replacement.tables.stores[0].name = "Alterada";
    replacement.tables.customers.push({ id: "invalid-clone", name: "Teste", createdAt: new Date().toISOString(), unsupported: () => {} });
    await expect(repository.restore(replacement)).rejects.toThrow();
    expect((await repository.snapshot()).tables).toEqual(original.tables);
  });
  it("accepts closed cash sessions and rejects inconsistent payment or closing values", async () => {
    const snapshot = await repository.snapshot();
    snapshot.tables.cashSessions.push({ id: "cash-x", storeId: "store-centro", openedAt: "2026-01-01T10:00:00.000Z", closedAt: "2026-01-01T18:00:00.000Z", openingBalance: 100, expectedBalance: 400, closingBalance: 415, difference: 15, closedBy: "Operadora", closingNote: "conferido" });
    snapshot.tables.customers.push({ id: "customer-x", name: "Cliente", createdAt: "2026-01-01T09:00:00.000Z" });
    snapshot.tables.sales.push({ id: "sale-x", customerId: "customer-x", storeId: "store-centro", status: "CONFIRMED", paymentStatus: "PAID", description: "Armação", total: 300, createdAt: "2026-01-01T11:00:00.000Z" });
    expect(() => validateBackup(snapshot)).not.toThrow();
    const negative = structuredClone(snapshot); negative.tables.cashSessions[0].closingBalance = -1;
    expect(() => validateBackup(negative)).toThrow("inválido");
    const uncounted = structuredClone(snapshot); uncounted.tables.cashSessions[0].difference = "15";
    expect(() => validateBackup(uncounted)).toThrow("inválido");
    const payment = structuredClone(snapshot); payment.tables.sales[0].paymentStatus = "RECEIVED";
    expect(() => validateBackup(payment)).toThrow("inválido");
  });
  it("accepts order scheduling fields and rejects invalid optional values", async () => {
    const snapshot = await repository.snapshot();
    snapshot.tables.customers.push({ id: "customer-os", name: "Cliente OS", createdAt: "2026-01-01T09:00:00.000Z" });
    snapshot.tables.sales.push({ id: "sale-os", customerId: "customer-os", storeId: "store-centro", status: "CONFIRMED", description: "Armação", total: 300, createdAt: "2026-01-01T11:00:00.000Z" });
    snapshot.tables.workOrders.push({ id: "os-x", saleId: "sale-os", storeId: "store-centro", customerId: "customer-os", status: "OPEN", createdAt: "2026-01-01T12:00:00.000Z", dueAt: "2026-02-01T12:00:00.000Z", notes: "Prazo combinado", updatedBy: "Operador", updatedAt: "2026-01-01T12:30:00.000Z" });
    expect(() => validateBackup(snapshot)).not.toThrow();
    const badPrazo = structuredClone(snapshot); badPrazo.tables.workOrders[0].dueAt = 123;
    expect(() => validateBackup(badPrazo)).toThrow("inválido");
    const badStatus = structuredClone(snapshot); badStatus.tables.workOrders[0].status = "PAUSED";
    expect(() => validateBackup(badStatus)).toThrow("inválido");
  });
  it("accepts sale stock items and rejects invalid quantities or broken links", async () => {
    const snapshot = await repository.snapshot();
    snapshot.tables.customers.push({ id: "customer-items", name: "Cliente Itens", createdAt: "2026-01-01T09:00:00.000Z" });
    snapshot.tables.inventoryItems.push({ id: "item-x", storeId: "store-centro", name: "Lente", quantity: 5, minimumQuantity: 1 });
    snapshot.tables.sales.push({ id: "sale-items", customerId: "customer-items", storeId: "store-centro", status: "QUOTE", description: "Venda com item", total: 120, createdAt: "2026-01-01T11:00:00.000Z", items: [{ inventoryItemId: "item-x", name: "Lente", quantity: 1, unitPrice: 120 }] });
    expect(() => validateBackup(snapshot)).not.toThrow();
    type ItemRow = { inventoryItemId: string; name: string; quantity: number; unitPrice: number };
    const saleItems = (row: Record<string, unknown>) => row.items as ItemRow[];
    const badQuantity = structuredClone(snapshot); saleItems(badQuantity.tables.sales[0])[0].quantity = 0;
    expect(() => validateBackup(badQuantity)).toThrow("inválido");
    const badPrice = structuredClone(snapshot); saleItems(badPrice.tables.sales[0])[0].unitPrice = -1;
    expect(() => validateBackup(badPrice)).toThrow("inválido");
    const badLink = structuredClone(snapshot); saleItems(badLink.tables.sales[0])[0].inventoryItemId = "missing-item";
    expect(() => validateBackup(badLink)).toThrow("inválido");
  });
});
