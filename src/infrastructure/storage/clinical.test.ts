import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { database } from "./database";
import { LocalAdministrationRepository, LocalAttendanceRepository, LocalClinicalRepository, LocalCustomerRepository } from "./local-repositories";
import { ClinicalService, type ClinicalContext } from "../../domain/clinical-service";
import { ReceptionService } from "../../domain/reception-service";
import { ClinicalDraft } from "../../app/clinical-draft";

const context: ClinicalContext = { storeId: "store-centro", session: { id: "current", role: "CLINICAL_PROFESSIONAL", userName: "Profissional teste" } };
const service = new ClinicalService(new LocalClinicalRepository());
let attendanceId: string;
beforeEach(async () => {
  await database.open(); await new LocalAdministrationRepository().initialize();
  const reception = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
  const customer = await reception.createCustomer({ name: "Cliente teste" });
  attendanceId = (await reception.startAttendance(customer.id, context.storeId, "CONSULTATION")).id;
});
afterEach(async () => { vi.restoreAllMocks(); await database.delete(); });

describe("clinical lifecycle", () => {
  it("migrates finalized legacy documents and fixes their attendance status", async () => {
    const definitions = Object.fromEntries(database.tables.filter((table) => table.name !== "clinicalVersions").map((table) => [table.name, [table.schema.primKey.src, ...table.schema.indexes.map((index) => index.src)].join(",")]));
    await database.delete();
    const legacy = new Dexie("opticore-v1"); legacy.version(9).stores(definitions);
    await legacy.open();
    await legacy.table("attendances").put({ id: "legacy", status: "WAITING" });
    await legacy.table("clinicalRecords").put({ attendanceId: "legacy", prescription: "Original antigo", finalizedAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-01T10:00:00.000Z", attachments: [] });
    legacy.close(); await database.open();
    expect((await database.attendances.get("legacy"))?.status).toBe("FINISHED");
    expect((await database.clinicalVersions.get("legacy:1"))?.prescription).toBe("Original antigo");
    expect((await database.clinicalRecords.get("legacy"))?.prescription).toBe("Original antigo");
  });
  it("persists drafts and resumes after reopening", async () => {
    const { record } = await service.load(attendanceId, context);
    const saved = await service.save({ ...record, anamnesis: "Rascunho" }, context);
    expect((await database.attendances.get(attendanceId))?.status).toBe("IN_PROGRESS");
    database.close(); await database.open();
    expect((await service.load(attendanceId, context)).record).toEqual(saved);
  });
  it("finalizes atomically and rejects edits of finalized documents", async () => {
    const { record } = await service.load(attendanceId, context);
    const finalized = await service.finalize({ ...record, prescription: "Receita teste" }, context);
    expect((await database.attendances.get(attendanceId))?.status).toBe("FINISHED");
    expect(await service.history(attendanceId, context)).toHaveLength(1);
    await expect(service.save({ ...finalized, prescription: "Alterada", finalizedAt: undefined }, context)).rejects.toThrow("finalizado");
  });
  it("amends with a reason and preserves the original version", async () => {
    const { record } = await service.load(attendanceId, context);
    const first = await service.finalize({ ...record, prescription: "Original" }, context);
    expect(() => service.amend(first, " ", context)).toThrow("motivo");
    const draft = await service.amend(first, "Correção de digitação", context);
    expect(draft.version).toBe(2);
    await service.finalize({ ...draft, prescription: "Corrigida" }, context);
    const versions = await service.history(attendanceId, context);
    expect(versions.map((item) => item.prescription)).toEqual(["Corrigida", "Original"]);
    expect(versions[0].author).toBe(context.session.userName);
  });
  it("rolls back the entire finalization on failure", async () => {
    const { record } = await service.load(attendanceId, context);
    const saved = await service.save({ ...record, prescription: "Receita" }, context);
    vi.spyOn(database.clinicalVersions, "add").mockRejectedValueOnce(new Error("Falha simulada"));
    await expect(service.finalize(saved, context)).rejects.toThrow("Falha simulada");
    expect((await database.clinicalRecords.get(attendanceId))?.finalizedAt).toBeUndefined();
    expect((await database.attendances.get(attendanceId))?.status).toBe("IN_PROGRESS");
  });
  it("rejects stale writes, unknown attendance and a different store", async () => {
    const { record } = await service.load(attendanceId, context);
    await service.save({ ...record, anamnesis: "Primeira aba" }, context);
    await expect(service.save({ ...record, anamnesis: "Segunda aba" }, context)).rejects.toThrow("outra aba");
    await expect(service.load("missing", context)).rejects.toThrow("não encontrado");
    await expect(service.load(attendanceId, { ...context, storeId: "store-shopping" })).rejects.toThrow("não encontrado");
    expect(() => service.load(attendanceId, { ...context, session: { ...context.session, role: "SELLER" } })).toThrow("não permitido");
  });
  it("rejects finalization without a prescription", async () => {
    const { record } = await service.load(attendanceId, context);
    expect(() => service.finalize(record, context)).toThrow("prescrição");
    expect(await database.clinicalVersions.count()).toBe(0);
  });
  it("serializes rapid autosaves without overwriting the most recent text", async () => {
    const { record } = await service.load(attendanceId, context);
    const draft = new ClinicalDraft(record, (next) => service.save(next, context), () => {});
    draft.change("anamnesis", "A"); draft.change("anamnesis", "AB"); draft.change("prescription", "Receita");
    await draft.flush();
    expect(draft.dirty).toBe(false);
    expect((await service.load(attendanceId, context)).record).toMatchObject({ anamnesis: "AB", prescription: "Receita" });
  });
  it("keeps unsaved text on failure and retries", async () => {
    const { record } = await service.load(attendanceId, context);
    const save = vi.fn().mockRejectedValue(new Error("Sem espaço"));
    const draft = new ClinicalDraft(record, save, () => {});
    draft.change("anamnesis", "Não perder");
    await expect(draft.flush()).rejects.toThrow("Sem espaço");
    expect(draft.dirty).toBe(true); expect(draft.record.anamnesis).toBe("Não perder");
    save.mockImplementation((next) => service.save(next, context));
    await draft.flush(); expect(draft.dirty).toBe(false);
  });
});
