import type { ClinicalRecord } from "./clinical";
import type { ClinicalRepository } from "./repositories";

export class ClinicalService {
  constructor(private readonly repository: ClinicalRepository) {}
  async load(attendanceId: string): Promise<ClinicalRecord> {
    return (await this.repository.get(attendanceId)) ?? { attendanceId, anamnesis: "", examination: "", prescription: "", updatedAt: new Date().toISOString() };
  }
  async save(record: ClinicalRecord): Promise<void> { await this.repository.save({ ...record, updatedAt: new Date().toISOString() }); }
}
