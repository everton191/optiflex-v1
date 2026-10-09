import { describe, expect, it } from "vitest";
import { ATTACHMENT_ALLOWED_MIME_TYPES, ATTACHMENT_MAX_BYTES, assertValidAttachment, assertValidAttachmentCategory, attachmentCategoryKeys, clinicalAttachmentCategoryLabels } from "./clinical";

const validFile = { name: "laudo.pdf", mimeType: "application/pdf", size: 2048, content: "aGVsbG8=" };

describe("clinical attachment validation", () => {
  it("accepts PDF, JPG and PNG files in any known category", () => {
    for (const mimeType of ATTACHMENT_ALLOWED_MIME_TYPES) expect(() => assertValidAttachment({ ...validFile, mimeType })).not.toThrow();
    for (const category of attachmentCategoryKeys) expect(() => assertValidAttachmentCategory(category)).not.toThrow();
    expect(clinicalAttachmentCategoryLabels).toMatchObject({ EXAM: "Exame", IMAGE: "Imagem", DOCUMENT: "Documento" });
  });
  it("recuses unknown types, empty files and oversized files with clear messages", () => {
    expect(() => assertValidAttachment({ ...validFile, mimeType: "text/plain" })).toThrow("Tipo de arquivo não permitido");
    expect(() => assertValidAttachment({ ...validFile, mimeType: "application/msword" })).toThrow("PDF, JPG ou PNG");
    expect(() => assertValidAttachment({ ...validFile, size: 0 })).toThrow("vazio");
    expect(() => assertValidAttachment({ ...validFile, size: ATTACHMENT_MAX_BYTES + 1 })).toThrow("5 MB");
  });
  it("recuses missing names, unreadable content and unknown categories", () => {
    expect(() => assertValidAttachment({ ...validFile, name: "   " })).toThrow("nome para o arquivo");
    expect(() => assertValidAttachment({ ...validFile, name: "a".repeat(181) })).toThrow("muito longo");
    expect(() => assertValidAttachment({ ...validFile, content: "" })).toThrow("Não foi possível ler o arquivo");
    expect(() => assertValidAttachment({ ...validFile, content: "conteúdo inválido!" })).toThrow("Não foi possível ler o arquivo");
    expect(() => assertValidAttachmentCategory("OTHER")).toThrow("Categoria de anexo inválida");
  });
});
