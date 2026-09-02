import Dexie, { type EntityTable } from "dexie";
import type { CurrentStoreContext, LocalSession, OrganizationSettings, Store, User } from "../../domain/access";

export class OpticoreDatabase extends Dexie {
  settings!: EntityTable<OrganizationSettings, "id">;
  sessions!: EntityTable<LocalSession, "id">;
  stores!: EntityTable<Store, "id">;
  users!: EntityTable<User, "id">;
  currentStore!: EntityTable<CurrentStoreContext, "id">;

  constructor() {
    super("opticore-v1");
    this.version(1).stores({ settings: "id", sessions: "id" });
    this.version(2).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId" });
  }
}

export const database = new OpticoreDatabase();
