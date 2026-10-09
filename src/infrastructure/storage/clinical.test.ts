import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { database } from "./database";
import { LocalAdministrationRepository, LocalAttendanceRepository, LocalClinicalRepository, LocalCustomerRepository } from "./local-repositories";
import { ClinicalService, type ClinicalContext } from "../../domain/clinical-service";
import { ATTACHMENT_MAX_BYTES } from "../../domain/clinical";
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

describe("clinical attachments", () => {
  const file = { name: "raio-x.png", mimeType: "image/png", size: 8, content: "aW1nLXBuZw==" };
  it("stores attachment content that survives reopening", async () => {
    const { record } = await service.load(attendanceId, context);
    const attachment = await service.storeAttachment(file, "IMAGE", context);
    expect(attachment.category).toBe("IMAGE");
    await service.save({ ...record, attachments: [attachment] }, context);
    expect(await service.readAttachmentContent(attachment.id, context)).toBe(file.content);
    database.close(); await database.open();
    expect((await service.load(attendanceId, context)).record.attachments.map((item) => item.id)).toEqual([attachment.id]);
    expect(await service.readAttachmentContent(attachment.id, context)).toBe(file.content);
  });
  it("recuses invalid uploads before storing anything", async () => {
    await expect(service.storeAttachment({ ...file, mimeType: "application/msword" }, "DOCUMENT", context)).rejects.toThrow("Tipo de arquivo não permitido");
    await expect(service.storeAttachment({ ...file, size: ATTACHMENT_MAX_BYTES + 1 }, "DOCUMENT", context)).rejects.toThrow("5 MB");
    await expect(service.storeAttachment(file, "OTHER" as never, context)).rejects.toThrow("Categoria de anexo inválida");
    expect(await database.attachments.count()).toBe(0);
  });
  it("attaches, detaches and drops content through the draft", async () => {
    const { record } = await service.load(attendanceId, context);
    const draft = new ClinicalDraft(record, (next) => service.save(next, context), () => {});
    const attachment = await service.storeAttachment(file, "EXAM", context);
    await draft.attach(attachment);
    expect(draft.dirty).toBe(false);
    expect((await service.load(attendanceId, context)).record.attachments.map((item) => item.id)).toEqual([attachment.id]);
    await draft.detach(attachment.id);
    expect((await service.load(attendanceId, context)).record.attachments).toHaveLength(0);
    await service.dropAttachmentContent(attachment.id, context);
    expect(await service.readAttachmentContent(attachment.id, context)).toBeUndefined();
  });
  it("blocks attachment changes on finalized documents", async () => {
    const { record } = await service.load(attendanceId, context);
    const attachment = await service.storeAttachment(file, "DOCUMENT", context);
    const saved = await service.save({ ...record, attachments: [attachment] }, context);
    const finalized = await service.finalize({ ...saved, prescription: "Receita teste" }, context);
    const draft = new ClinicalDraft(finalized, (next) => service.save(next, context), () => {});
    await expect(draft.attach(attachment)).rejects.toThrow("correção");
    await expect(draft.detach(attachment.id)).rejects.toThrow("correção");
  });
  it("keeps content referenced by finalized versions after a correction", async () => {
    const { record } = await service.load(attendanceId, context);
    const attachment = await service.storeAttachment(file, "EXAM", context);
    const saved = await service.save({ ...record, attachments: [attachment] }, context);
    const finalized = await service.finalize({ ...saved, prescription: "Original" }, context);
    const amended = await service.amend(finalized, "Retirar anexo", context);
    const updated = await service.save({ ...amended, attachments: [] }, context);
    expect(updated.attachments).toHaveLength(0);
    expect((await service.history(attendanceId, context))[0]?.attachments).toHaveLength(1);
    expect(await service.readAttachmentContent(attachment.id, context)).toBe(file.content);
  });
});
