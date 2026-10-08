import type { ClinicalRecord } from "../domain/clinical";

export class ClinicalDraft {
  record: ClinicalRecord;
  dirty = false;
  error = "";
  private chain: Promise<void> = Promise.resolve();
  private generation = 0;
  private persisted: ClinicalRecord;
  constructor(record: ClinicalRecord, private save: (record: ClinicalRecord) => Promise<ClinicalRecord>, private notify: () => void) {
    this.record = record; this.persisted = record;
  }
  change(field: "anamnesis" | "examination" | "prescription" | "requests", value: string) {
    if (this.record.finalizedAt) return;
    this.record = { ...this.record, [field]: value }; this.generation++; this.dirty = true; this.notify();
    void this.flush().catch(() => { /* Error remains visible; never discard the draft. */ });
  }
  flush(): Promise<void> {
    const operation = this.chain.then(async () => {
      if (!this.dirty) return;
      const generation = this.generation;
      try {
        const saved = await this.save({ ...this.record, revision: this.persisted.revision, updatedAt: this.persisted.updatedAt });
        this.persisted = saved;
        if (generation === this.generation) { this.record = saved; this.dirty = false; }
        this.error = "";
      } catch (error) {
        this.error = error instanceof Error && error.name === "Error" ? error.message : "Não foi possível salvar. Mantenha esta tela aberta e tente novamente.";
        throw error;
      } finally { this.notify(); }
    });
    this.chain = operation.catch(() => {});
    return operation;
  }
}
