export interface ClinicalRecord {
  attendanceId: string;
  anamnesis: string;
  examination: string;
  prescription: string;
  requests: string;
  attachments: ClinicalAttachment[];
  finalizedAt?: string;
  updatedAt: string;
  revision?: number;
  version?: number;
  author?: string;
  amendmentReason?: string;
}

export interface ClinicalVersion extends ClinicalRecord { id: string; finalizedAt: string; }

export type ClinicalAttachmentCategory = "EXAM" | "IMAGE" | "DOCUMENT";

export const clinicalAttachmentCategoryLabels: Record<ClinicalAttachmentCategory, string> = { EXAM: "Exame", IMAGE: "Imagem", DOCUMENT: "Documento" };
export const attachmentCategoryKeys = Object.keys(clinicalAttachmentCategoryLabels) as ClinicalAttachmentCategory[];

export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const ATTACHMENT_TYPE_LABEL = "PDF, JPG ou PNG";

export interface ClinicalAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  category?: ClinicalAttachmentCategory;
}

// Base64 payload stored beside the metadata; JSON-safe so backups keep the real file content.
export interface ClinicalAttachmentContent { id: string; content: string; }

export function assertValidAttachmentCategory(category: string): asserts category is ClinicalAttachmentCategory {
  if (!Object.hasOwn(clinicalAttachmentCategoryLabels, category)) throw new Error("Categoria de anexo inválida.");
}

export function assertValidAttachment(input: { name: string; mimeType: string; size: number; content: string }): void {
  const name = input.name.trim();
  if (!name) throw new Error("Informe um nome para o arquivo.");
  if (name.length > 180) throw new Error("Nome do arquivo muito longo (máximo de 180 caracteres).");
  if (!ATTACHMENT_ALLOWED_MIME_TYPES.includes(input.mimeType as (typeof ATTACHMENT_ALLOWED_MIME_TYPES)[number])) throw new Error(`Tipo de arquivo não permitido. Envie ${ATTACHMENT_TYPE_LABEL}.`);
  if (!Number.isFinite(input.size) || input.size <= 0) throw new Error("O arquivo está vazio.");
  if (input.size > ATTACHMENT_MAX_BYTES) throw new Error(`Arquivo excede o limite de ${ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB.`);
  if (typeof input.content !== "string" || !input.content || input.content.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.content)) throw new Error("Não foi possível ler o arquivo. Tente novamente.");
}
