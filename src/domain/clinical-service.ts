import { hasPermission, type LocalSession } from "./access";
import { assertValidAttachment, assertValidAttachmentCategory, type ClinicalAttachment, type ClinicalAttachmentCategory, type ClinicalRecord } from "./clinical";
import type { ClinicalRepository } from "./repositories";

export interface ClinicalContext { storeId: string; session: LocalSession; }
export class ClinicalService {
  constructor(private readonly repository: ClinicalRepository) {}
  private authorize(context: ClinicalContext) {
    if (!context.storeId || !context.session.userName || !hasPermission(context.session.role, "clinical.workspace.access")) throw new Error("Acesso clínico não permitido.");
  }
  load(attendanceId: string, context: ClinicalContext) {
    this.authorize(context);
    return this.repository.load(attendanceId, context.storeId);
  }
  save(record: ClinicalRecord, context: ClinicalContext) {
    this.authorize(context);
    return this.repository.write(record, context.storeId, context.session.userName, "save");
  }
  finalize(record: ClinicalRecord, context: ClinicalContext) {
    this.authorize(context);
    if (!record.prescription.trim()) throw new Error("Preencha a prescrição antes de finalizar.");
    return this.repository.write(record, context.storeId, context.session.userName, "finalize");
  }
  amend(record: ClinicalRecord, reason: string, context: ClinicalContext) {
    this.authorize(context);
    if (!reason.trim()) throw new Error("Informe o motivo da correção.");
    return this.repository.write(record, context.storeId, context.session.userName, "amend", reason.trim());
  }
  history(attendanceId: string, context: ClinicalContext) {
    this.authorize(context);
    return this.repository.history(attendanceId, context.storeId);
  }
  async storeAttachment(file: { name: string; mimeType: string; size: number; content: string }, category: ClinicalAttachmentCategory, context: ClinicalContext): Promise<ClinicalAttachment> {
    this.authorize(context);
    assertValidAttachmentCategory(category);
    assertValidAttachment(file);
    const attachment: ClinicalAttachment = { id: `attachment-${crypto.randomUUID()}`, name: file.name.trim(), mimeType: file.mimeType, size: file.size, category, createdAt: new Date().toISOString() };
    await this.repository.putAttachmentContent(attachment.id, file.content);
    return attachment;
  }
  readAttachmentContent(attachmentId: string, context: ClinicalContext): Promise<string | undefined> {
    this.authorize(context);
    return this.repository.getAttachmentContent(attachmentId);
  }
  async dropAttachmentContent(attachmentId: string, context: ClinicalContext): Promise<void> {
    this.authorize(context);
    await this.repository.deleteAttachmentContent(attachmentId);
  }
}
