import { hasPermission, type RoleKey } from "./access";
import { clinicalAttachmentCategoryLabels, prescriptionUsageLabels, type ClinicalAttachment, type Prescription } from "./clinical";

export type CustomerClinicalDocumentKind = "PRESCRIPTION" | "CLINICAL_RECORD" | "ATTACHMENT";

export const customerClinicalDocumentKinds: readonly CustomerClinicalDocumentKind[] = ["PRESCRIPTION", "CLINICAL_RECORD", "ATTACHMENT"];

export const customerClinicalDocumentKindLabels: Record<CustomerClinicalDocumentKind, string> = {
  PRESCRIPTION: "Prescrição",
  CLINICAL_RECORD: "Prontuário",
  ATTACHMENT: "Anexo"
};

// Texto clínico nunca entra neste resumo: o perfil exibe existência/estado, não o conteúdo (P0 de segurança).
export interface CustomerClinicalRecordSummary {
  attendanceId: string;
  storeId: string;
  updatedAt: string;
  finalizedAt?: string;
  hasAnamnesis: boolean;
  hasExamination: boolean;
  attachments: readonly ClinicalAttachment[];
}

export interface CustomerClinicalDocument {
  id: string;
  kind: CustomerClinicalDocumentKind;
  at: string;
  title: string;
  detail?: string;
  href?: string;
  storeId: string;
  otherStore: boolean;
}

export interface CustomerClinicalHistoryInput {
  prescriptions: readonly Prescription[];
  records: readonly CustomerClinicalRecordSummary[];
}

export interface CustomerClinicalHistoryOptions {
  role: RoleKey;
  currentStoreId?: string;
}

export function canViewClinicalHistory(role: RoleKey): boolean {
  return hasPermission(role, "clinical.workspace.access");
}

export function buildCustomerClinicalDocuments(input: CustomerClinicalHistoryInput, options: CustomerClinicalHistoryOptions): CustomerClinicalDocument[] {
  if (!canViewClinicalHistory(options.role)) return [];
  const otherStore = (storeId: string) => Boolean(options.currentStoreId) && storeId !== options.currentStoreId;
  const documents: CustomerClinicalDocument[] = [];
  for (const prescription of input.prescriptions) {
    const usage = prescription.usage ? prescriptionUsageLabels[prescription.usage] : "Uso não informado";
    documents.push({
      id: `prescription-${prescription.id}`,
      kind: "PRESCRIPTION",
      at: prescription.issuedAt,
      title: "Prescrição",
      detail: `${usage} · v${prescription.version}${prescription.retifies ? " · Retificada" : ""}`,
      href: `/clinico/atendimento/${prescription.attendanceId}`,
      storeId: prescription.storeId,
      otherStore: otherStore(prescription.storeId)
    });
  }
  for (const record of input.records) {
    const hasContent = record.hasAnamnesis || record.hasExamination || record.attachments.length > 0;
    if (!hasContent) continue;
    documents.push({
      id: `clinical-record-${record.attendanceId}`,
      kind: "CLINICAL_RECORD",
      at: record.finalizedAt ?? record.updatedAt,
      title: "Prontuário clínico",
      detail: record.finalizedAt ? "Finalizado" : "Em edição",
      href: `/clinico/atendimento/${record.attendanceId}`,
      storeId: record.storeId,
      otherStore: otherStore(record.storeId)
    });
    for (const attachment of record.attachments) {
      documents.push({
        id: `attachment-${attachment.id}`,
        kind: "ATTACHMENT",
        at: attachment.createdAt,
        title: attachment.name,
        detail: attachment.category ? clinicalAttachmentCategoryLabels[attachment.category] : "Anexo",
        href: `/clinico/atendimento/${record.attendanceId}`,
        storeId: record.storeId,
        otherStore: otherStore(record.storeId)
      });
    }
  }
  return documents.sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
}
