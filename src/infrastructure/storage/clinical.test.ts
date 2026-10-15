import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { database } from "./database";
import { LocalAdministrationRepository, LocalAttendanceRepository, LocalClinicalRepository, LocalCustomerRepository, LocalPrescriptionRepository } from "./local-repositories";
import { ClinicalService, type ClinicalContext } from "../../domain/clinical-service";
import { ATTACHMENT_MAX_BYTES, activePrescription } from "../../domain/clinical";
import { ReceptionService } from "../../domain/reception-service";
import { ClinicalDraft } from "../../app/clinical-draft";

const context: ClinicalContext = { storeId: "store-centro", session: { id: "current", role: "CLINICAL_PROFESSIONAL", userName: "Profissional teste" } };
const service = new ClinicalService(new LocalClinicalRepository(), new LocalPrescriptionRepository());
let attendanceId: string;
let customerId: string;
beforeEach(async () => {
  await database.open(); await new LocalAdministrationRepository().initialize();
  const reception = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
  const customer = await reception.createCustomer({ name: "Cliente teste" });
  customerId = customer.id;
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

describe("customer update durability", () => {
  it("persists edited contacts after reopening and keeps the profile consistent", async () => {
    const reception = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
    const customer = await reception.createCustomer({ name: "Cliente edição", phone: "1111" });
    const updated = await reception.updateCustomer(customer.id, { name: "Cliente editado", phone: "2222", cpf: "111.444.777-35", email: "novo@exemplo.com", birthDate: "1992-03-10" });
    database.close();
    await database.open();
    expect(await reception.getCustomer(customer.id)).toMatchObject({ id: customer.id, createdAt: customer.createdAt, name: "Cliente editado", phone: "2222", cpf: "111.444.777-35", email: "novo@exemplo.com", birthDate: "1992-03-10" });
    expect(await reception.listCustomers("editado")).toHaveLength(1);
    expect(updated.id).toBe(customer.id);
  });
});

describe("structured refraction", () => {
  it("issues OD/OE degrees, keeps the author and survives reopening", async () => {
    const rx = await service.issuePrescription({ customerId, od: { sphere: -1.25, cylinder: -0.5, axis: 90 }, oe: { sphere: -1, cylinder: -0.25, axis: 85, add: 0.5 }, notes: "  Uso contínuo  " }, attendanceId, context);
    expect(rx).toMatchObject({ version: 1, author: "Profissional teste", attendanceId, customerId, storeId: "store-centro", notes: "Uso contínuo" });
    expect(rx.od).toEqual({ sphere: -1.25, cylinder: -0.5, axis: 90 });
    expect(rx.oe).toEqual({ sphere: -1, cylinder: -0.25, axis: 85, add: 0.5 });
    database.close(); await database.open();
    const listed = await service.listPrescriptions(attendanceId, context);
    expect(listed).toHaveLength(1);
    expect(activePrescription(listed)?.id).toBe(rx.id);
  });

  it("rejects an axis outside 0–180 and non-finite degrees before writing", async () => {
    await expect(service.issuePrescription({ customerId, od: { axis: 181 }, oe: {} }, attendanceId, context)).rejects.toThrow("entre 0° e 180°");
    await expect(service.issuePrescription({ customerId, od: { axis: -1 }, oe: {} }, attendanceId, context)).rejects.toThrow("entre 0° e 180°");
    await expect(service.issuePrescription({ customerId, od: { sphere: Number.NaN }, oe: {} }, attendanceId, context)).rejects.toThrow("Grau inválido");
    await expect(service.issuePrescription({ customerId, od: {}, oe: {} }, attendanceId, context)).rejects.toThrow("ao menos um grau");
    expect(await database.prescriptions.count()).toBe(0);
  });

  it("scopes the prescription list to the attendance store", async () => {
    await service.issuePrescription({ customerId, od: { sphere: -1 }, oe: {} }, attendanceId, context);
    await expect(service.listPrescriptions(attendanceId, { ...context, storeId: "store-shopping" })).rejects.toThrow("não encontrado nesta loja");
  });

  it("retifies through the service keeping the original author, date and reason visible", async () => {
    const original = await service.issuePrescription({ customerId, od: { sphere: -1.25 }, oe: {}, usage: "CONTINUOUS" }, attendanceId, context);
    const retified = await service.retifyPrescription(original, { od: { sphere: -1.75 }, oe: {}, usage: "DISTANCE" }, "  Grau conferido  ", context);
    expect(retified).toMatchObject({ version: 2, retifies: original.id, retificationReason: "Grau conferido", author: "Profissional teste", usage: "DISTANCE" });
    const listed = await service.listPrescriptions(attendanceId, context);
    const originalRow = listed.find((item) => item.id === original.id);
    expect(originalRow).toMatchObject({ version: 1, author: "Profissional teste", issuedAt: original.issuedAt, usage: "CONTINUOUS" });
    expect(originalRow?.retifies).toBeUndefined();
    expect(activePrescription(listed)?.id).toBe(retified.id);
    await expect(service.retifyPrescription(original, { od: { sphere: -1.75 }, oe: {} }, "   ", context)).rejects.toThrow("motivo da retificação");
  });

  it("lists a customer's prescriptions for the sale desk, scoped by store", async () => {
    await service.issuePrescription({ customerId, od: { sphere: -1 }, oe: {}, notes: "Longe" }, attendanceId, context);
    const repository = new LocalPrescriptionRepository();
    expect(await repository.listByCustomer(customerId, "store-centro")).toHaveLength(1);
    expect(await repository.listByCustomer("customer-inexistente", "store-centro")).toHaveLength(0);
    expect(await repository.listByCustomer(customerId, "store-shopping")).toHaveLength(0);
  });

  it("loads a single prescription by id for the printable document, scoped by store", async () => {
    const issued = await service.issuePrescription({ customerId, od: { sphere: -1.25 }, oe: { add: 0.5 } }, attendanceId, context);
    const loaded = await service.getPrescription(issued.id, context);
    expect(loaded).toMatchObject({ id: issued.id, version: 1, storeId: "store-centro" });
    expect(await service.getPrescription(issued.id, { ...context, storeId: "store-shopping" })).toBeUndefined();
    expect(await service.getPrescription("rx-inexistente", context)).toBeUndefined();
    await expect(service.getPrescription(issued.id, { ...context, session: { ...context.session, role: "SELLER" as never } })).rejects.toThrow("não permitido");
  });
});
