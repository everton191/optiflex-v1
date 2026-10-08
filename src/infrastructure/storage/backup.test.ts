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
    const encrypted = await service.create(password, "OWNER");
    expect(encrypted).not.toContain("Nome confidencial");
    const snapshot = await service.inspect(encrypted, password, "OWNER");
    expect(snapshot.tables.customers).toHaveLength(1);
    expect(snapshot.tables).not.toHaveProperty("sessions");
    await database.customers.clear();
    await service.restore(snapshot, "RESTAURAR", "OWNER");
    expect((await database.customers.get("test"))?.name).toBe("Nome confidencial teste");
    expect((await database.sessions.get("current"))?.role).toBe("RECEPTIONIST");
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
});
