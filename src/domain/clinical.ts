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

export interface PrescriptionEye {
  sphere?: number;
  cylinder?: number;
  axis?: number;
  add?: number;
}

// Append-only document: issued versions are never rewritten; retification adds a new version linked to the previous one.
export interface Prescription {
  id: string;
  attendanceId: string;
  customerId: string;
  storeId: string;
  version: number;
  author: string;
  issuedAt: string;
  od: PrescriptionEye;
  oe: PrescriptionEye;
  notes?: string;
  retifies?: string;
  retificationReason?: string;
}

export interface PrescriptionInput {
  attendanceId: string;
  customerId: string;
  storeId: string;
  od: PrescriptionEye;
  oe: PrescriptionEye;
  notes?: string;
}

function assertEyeDegrees(eye: PrescriptionEye): void {
  for (const key of ["sphere", "cylinder", "add"] as const) {
    const value = eye[key];
    if (value !== undefined && !Number.isFinite(value)) throw new Error("Grau inválido na prescrição.");
  }
  const axis = eye.axis;
  if (axis !== undefined && (!Number.isFinite(axis) || axis < 0 || axis > 180)) throw new Error("O eixo deve estar entre 0° e 180°.");
}

function normalizeEye(eye: PrescriptionEye): PrescriptionEye {
  const normalized: PrescriptionEye = {};
  for (const key of ["sphere", "cylinder", "axis", "add"] as const) if (eye[key] !== undefined) normalized[key] = eye[key];
  return normalized;
}

function hasEyeValue(eye: PrescriptionEye): boolean {
  return (["sphere", "cylinder", "axis", "add"] as const).some((key) => eye[key] !== undefined);
}

function assertPrescriptionInput(input: PrescriptionInput, author: string, now: string): string {
  const trimmedAuthor = author.trim();
  if (!trimmedAuthor) throw new Error("Informe o responsável pela prescrição.");
  for (const [field, value] of [["atendimento", input.attendanceId], ["cliente", input.customerId], ["loja", input.storeId]] as const) {
    if (!value || !value.trim()) throw new Error(`Prescrição sem ${field}.`);
  }
  if (!Number.isFinite(Date.parse(now))) throw new Error("Data da prescrição inválida.");
  assertEyeDegrees(input.od);
  assertEyeDegrees(input.oe);
  if (!hasEyeValue(input.od) && !hasEyeValue(input.oe) && !input.notes?.trim()) throw new Error("Informe ao menos um grau (OD/OE) ou uma observação.");
  return trimmedAuthor;
}

export function issuePrescription(input: PrescriptionInput, author: string, now = new Date().toISOString()): Prescription {
  const trimmedAuthor = assertPrescriptionInput(input, author, now);
  return {
    id: `rx-${crypto.randomUUID()}`,
    attendanceId: input.attendanceId.trim(),
    customerId: input.customerId.trim(),
    storeId: input.storeId.trim(),
    version: 1,
    author: trimmedAuthor,
    issuedAt: now,
    od: normalizeEye(input.od),
    oe: normalizeEye(input.oe),
    notes: input.notes?.trim() || undefined,
  };
}

export function retifyPrescription(current: Prescription, input: PrescriptionInput, reason: string, author: string, now = new Date().toISOString()): Prescription {
  const trimmedReason = reason.trim();
  if (!trimmedReason) throw new Error("Informe o motivo da retificação.");
  if (!Number.isSafeInteger(current.version) || current.version < 1) throw new Error("Prescrição base inválida.");
  if (input.attendanceId.trim() !== current.attendanceId || input.customerId.trim() !== current.customerId || input.storeId.trim() !== current.storeId) {
    throw new Error("A retificação deve apontar para o mesmo atendimento, cliente e loja da prescrição original.");
  }
  const next = issuePrescription(input, author, now);
  return { ...next, version: current.version + 1, retifies: current.id, retificationReason: trimmedReason };
}

export function activePrescription(prescriptions: readonly Prescription[]): Prescription | undefined {
  const retified = new Set(prescriptions.map((prescription) => prescription.retifies).filter((id): id is string => Boolean(id)));
  return prescriptions.filter((prescription) => !retified.has(prescription.id)).sort((a, b) => b.version - a.version)[0];
}
