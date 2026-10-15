import { describe, expect, it } from "vitest";
import { activePrescription, issuePrescription, prescriptionUsageKeys, prescriptionUsageLabels, retifyPrescription, type Prescription, type PrescriptionInput } from "./clinical";

const input: PrescriptionInput = {
  attendanceId: "att-1",
  customerId: "customer-1",
  storeId: "store-centro",
  od: { sphere: -1.25, cylinder: -0.5, axis: 90 },
  oe: { sphere: -1, cylinder: -0.25, axis: 85, add: 0.5 },
  usage: "CONTINUOUS",
  notes: "Uso contínuo",
};
const issuedAt = "2026-10-08T10:00:00.000Z";

describe("issuing a prescription", () => {
  it("creates version 1 with author, date and normalized optional fields", () => {
    const prescription = issuePrescription({ ...input, od: { sphere: -1.25, axis: 90 }, notes: "  Uso contínuo  " }, "  Dra. Ana  ", issuedAt);
    expect(prescription).toMatchObject({ version: 1, author: "Dra. Ana", attendanceId: "att-1", storeId: "store-centro", notes: "Uso contínuo", usage: "CONTINUOUS" });
    expect(prescription.id).toMatch(/^rx-/);
    expect(prescription.od).toEqual({ sphere: -1.25, axis: 90 });
    expect(prescription.od.cylinder).toBeUndefined();
    expect(prescription.oe).toEqual({ sphere: -1, cylinder: -0.25, axis: 85, add: 0.5 });
    expect(prescription.retifies).toBeUndefined();
  });

  it("rejects missing author, ids, invalid date, empty content and bad degrees", () => {
    expect(() => issuePrescription(input, "   ", issuedAt)).toThrow("responsável");
    expect(() => issuePrescription({ ...input, customerId: " " }, "Dra. Ana", issuedAt)).toThrow("sem cliente");
    expect(() => issuePrescription(input, "Dra. Ana", "não-é-data")).toThrow("Data da prescrição inválida");
    expect(() => issuePrescription({ ...input, od: {}, oe: {}, notes: "  " }, "Dra. Ana", issuedAt)).toThrow("ao menos um grau");
    expect(() => issuePrescription(input, "Dra. Ana", issuedAt)).not.toThrow();
    expect(() => issuePrescription({ ...input, od: { axis: 200 } }, "Dra. Ana", issuedAt)).toThrow("eixo deve estar entre 0° e 180°");
    expect(() => issuePrescription({ ...input, od: { add: Number.NaN } }, "Dra. Ana", issuedAt)).toThrow("Grau inválido");
  });

  it("accepts a notes-only prescription when there is no degree yet", () => {
    const prescription = issuePrescription({ ...input, od: {}, oe: {}, notes: "Aguardando refração" }, "Dra. Ana", issuedAt);
    expect(prescription.notes).toBe("Aguardando refração");
  });

  it("validates the usage type and keeps it optional for older documents", () => {
    expect(prescriptionUsageKeys).toEqual(["DISTANCE", "NEAR", "CONTINUOUS", "MULTIFOCAL"]);
    expect(prescriptionUsageLabels.MULTIFOCAL).toBe("Multifocal");
    const withoutUsage = issuePrescription({ ...input, usage: undefined }, "Dra. Ana", issuedAt);
    expect(withoutUsage.usage).toBeUndefined();
    expect(() => issuePrescription({ ...input, usage: "PARA CORRIDA" as never }, "Dra. Ana", issuedAt)).toThrow("Tipo de uso inválido");
  });
});

describe("retification", () => {
  it("creates a new version linked to the original and keeps the original untouched", () => {
    const original = issuePrescription(input, "Dra. Ana", issuedAt);
    const snapshot = JSON.parse(JSON.stringify(original));
    const retified = retifyPrescription(original, { ...input, od: { sphere: -1.5, cylinder: -0.75, axis: 95 }, usage: "DISTANCE" }, "  Grau conferido na revisão  ", " Dr. Bruno ", "2026-10-09T10:00:00.000Z");
    expect(retified).toMatchObject({ version: 2, retifies: original.id, retificationReason: "Grau conferido na revisão", author: "Dr. Bruno", issuedAt: "2026-10-09T10:00:00.000Z", usage: "DISTANCE" });
    expect(retified.id).not.toBe(original.id);
    expect(retified.od).toEqual({ sphere: -1.5, cylinder: -0.75, axis: 95 });
    expect(original.usage).toBe("CONTINUOUS");
    expect(JSON.parse(JSON.stringify(original))).toEqual(snapshot);
    expect(activePrescription([original, retified])).toBe(retified);
    expect(activePrescription([original])).toBe(original);
  });

  it("chains versions and rejects a missing reason, bad base or mismatched context", () => {
    const v1 = issuePrescription(input, "Dra. Ana", issuedAt);
    const v2 = retifyPrescription(v1, input, "Motivo", "Dra. Ana", "2026-10-09T10:00:00.000Z");
    const v3 = retifyPrescription(v2, input, "Segundo ajuste", "Dra. Ana", "2026-10-10T10:00:00.000Z");
    expect([v1.version, v2.version, v3.version]).toEqual([1, 2, 3]);
    expect(v3.retifies).toBe(v2.id);
    expect(() => retifyPrescription(v1, input, "   ", "Dra. Ana")).toThrow("motivo da retificação");
    expect(() => retifyPrescription({ ...v1, version: 0 }, input, "Motivo", "Dra. Ana")).toThrow("base inválida");
    expect(() => retifyPrescription(v1, { ...input, storeId: "store-shopping" }, "Motivo", "Dra. Ana")).toThrow("mesmo atendimento");
    expect(activePrescription([v1, v2, v3])).toBe(v3);
    expect(activePrescription([])).toBeUndefined();
  });
});
