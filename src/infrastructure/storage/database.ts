import Dexie, { type EntityTable } from "dexie";
import type { CurrentStoreContext, LocalSession, OrganizationSettings, Store, User } from "../../domain/access";
import type { Attendance, Customer } from "../../domain/customer";

export class OpticoreDatabase extends Dexie {
  settings!: EntityTable<OrganizationSettings, "id">;
  sessions!: EntityTable<LocalSession, "id">;
  stores!: EntityTable<Store, "id">;
  users!: EntityTable<User, "id">;
  currentStore!: EntityTable<CurrentStoreContext, "id">;
  customers!: EntityTable<Customer, "id">;
  attendances!: EntityTable<Attendance, "id">;

  constructor() {
    super("opticore-v1");
    this.version(1).stores({ settings: "id", sessions: "id" });
    this.version(2).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId" });
    this.version(3).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt" });
  }
}

export const database = new OpticoreDatabase();
