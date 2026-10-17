import { describe, expect, it } from "vitest";
import type { Prescription } from "./clinical";
import { buildCustomerClinicalDocuments, canViewClinicalHistory, type CustomerClinicalRecordSummary } from "./customer-clinical-history";

function prescription(overrides: Partial<Prescription> = {}): Prescription {
  return {
    id: "rx-1",
    attendanceId: "att-1",
    customerId: "customer-1",
    storeId: "store-centro",
    version: 1,
    author: "Dra. Ana",
    issuedAt: "2026-10-01T10:00:00.000Z",
    od: { sphere: -1.25, cylinder: -0.5, axis: 90 },
    oe: { sphere: -1, cylinder: -0.25, axis: 85 },
    usage: "DISTANCE",
    ...overrides
  };
}

function record(overrides: Partial<CustomerClinicalRecordSummary> = {}): CustomerClinicalRecordSummary {
  return {
    attendanceId: "att-1",
    storeId: "store-centro",
    updatedAt: "2026-10-01T09:00:00.000Z",
    hasAnamnesis: true,
    hasExamination: false,
    attachments: [],
    ...overrides
  };
}

describe("customer clinical documents guide", () => {
  it("hides every clinical document from roles without clinical access", () => {
    const documents = buildCustomerClinicalDocuments(
      { prescriptions: [prescription()], records: [record()] },
      { role: "SELLER", currentStoreId: "store-centro" }
    );
    expect(documents).toEqual([]);
    expect(canViewClinicalHistory("SELLER")).toBe(false);
    expect(canViewClinicalHistory("CLINICAL_PROFESSIONAL")).toBe(true);
  });

  it("lists prescriptions with usage, version and retification, newest first", () => {
    const documents = buildCustomerClinicalDocuments(
      {
        prescriptions: [
          prescription({ id: "rx-1", issuedAt: "2026-10-01T10:00:00.000Z", usage: "DISTANCE" }),
          prescription({ id: "rx-2", attendanceId: "att-2", issuedAt: "2026-10-05T10:00:00.000Z", version: 2, usage: "MULTIFOCAL", retifies: "rx-1" })
        ],
        records: []
      },
      { role: "CLINICAL_PROFESSIONAL", currentStoreId: "store-centro" }
    );
    expect(documents.map((document) => document.id)).toEqual(["prescription-rx-2", "prescription-rx-1"]);
    expect(documents[0]).toMatchObject({ kind: "PRESCRIPTION", detail: "Multifocal · v2 · Retificada", href: "/clinico/atendimento/att-2", otherStore: false });
    expect(documents[1]).toMatchObject({ kind: "PRESCRIPTION", detail: "À distância · v1" });
  });

  it("lists finalized and draft records with attachments and skips empty records", () => {
    const documents = buildCustomerClinicalDocuments(
      {
        prescriptions: [],
        records: [
          record({ attendanceId: "att-1", finalizedAt: "2026-10-02T12:00:00.000Z", updatedAt: "2026-10-02T11:00:00.000Z", attachments: [{ id: "file-1", name: "retina.jpg", mimeType: "image/jpeg", size: 1024, createdAt: "2026-10-02T11:30:00.000Z", category: "IMAGE" }] }),
          record({ attendanceId: "att-2", updatedAt: "2026-10-03T09:00:00.000Z", hasAnamnesis: false, hasExamination: true }),
          record({ attendanceId: "att-3", updatedAt: "2026-10-04T09:00:00.000Z", hasAnamnesis: false, hasExamination: false, attachments: [] })
        ]
      },
      { role: "OWNER", currentStoreId: "store-centro" }
    );
    expect(documents.map((document) => document.id)).toEqual(["clinical-record-att-2", "clinical-record-att-1", "attachment-file-1"]);
    expect(documents.find((document) => document.id === "clinical-record-att-1")).toMatchObject({ kind: "CLINICAL_RECORD", detail: "Finalizado", at: "2026-10-02T12:00:00.000Z", href: "/clinico/atendimento/att-1" });
    expect(documents.find((document) => document.id === "clinical-record-att-2")).toMatchObject({ kind: "CLINICAL_RECORD", detail: "Em edição" });
    expect(documents.find((document) => document.id === "attachment-file-1")).toMatchObject({ kind: "ATTACHMENT", title: "retina.jpg", detail: "Imagem", href: "/clinico/atendimento/att-1" });
  });

  it("flags documents from another store and never leaks clinical text", () => {
    const documents = buildCustomerClinicalDocuments(
      { prescriptions: [prescription({ storeId: "store-shopping" })], records: [record({ storeId: "store-shopping", attendanceId: "att-9" })] },
      { role: "CLINICAL_PROFESSIONAL", currentStoreId: "store-centro" }
    );
    expect(documents.every((document) => document.otherStore)).toBe(true);
    const serialized = JSON.stringify(documents);
    expect(serialized).not.toContain("hipertensão");
    expect(serialized).not.toContain("miopia");
  });
});
