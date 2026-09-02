import Dexie, { type EntityTable } from "dexie";
import type { LocalSession, OrganizationSettings } from "../../domain/access";

export class OpticoreDatabase extends Dexie {
  settings!: EntityTable<OrganizationSettings, "id">;
  sessions!: EntityTable<LocalSession, "id">;

  constructor() {
    super("opticore-v1");
    this.version(1).stores({ settings: "id", sessions: "id" });
  }
}

export const database = new OpticoreDatabase();
