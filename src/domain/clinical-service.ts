import type { ClinicalRecord } from "./clinical";
import type { ClinicalRepository } from "./repositories";

export class ClinicalService {
  constructor(private readonly repository: ClinicalRepository) {}
  async load(attendanceId: string): Promise<ClinicalRecord> {
    return (await this.repository.get(attendanceId)) ?? { attendanceId, anamnesis: "", examination: "", prescription: "", requests: "", attachments: [], updatedAt: new Date().toISOString() };
  }
  async save(record: ClinicalRecord): Promise<void> { await this.repository.save({ ...record, updatedAt: new Date().toISOString() }); }
  async finalize(record: ClinicalRecord): Promise<void> {
    if (!record.prescription.trim()) throw new Error("A prescrição deve ser preenchida antes da finalização.");
    await this.save({ ...record, finalizedAt: new Date().toISOString() });
  }
}
