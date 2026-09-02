import type { CurrentStoreContext, LocalSession, OrganizationSettings, Store, User } from "../../domain/access";
import type { Attendance, Customer } from "../../domain/customer";
import type { AdministrationRepository, AttendanceRepository, CustomerRepository, SessionRepository, SettingsRepository } from "../../domain/repositories";
import { database } from "./database";

const defaultSettings: OrganizationSettings = {
  id: "current",
  organizationName: "Opticore Demo",
  clinicalProfessionalLabel: "Profissional clínico"
};

const defaultSession: LocalSession = { id: "current", userName: "Administrador local", role: "OWNER" };
const seedStores: Store[] = [{ id: "store-centro", name: "Loja Centro", active: true }, { id: "store-shopping", name: "Loja Shopping", active: true }];
const seedUsers: User[] = [
  { id: "user-owner", name: "Administrador local", email: "admin@opticore.local", role: "OWNER", scope: "NETWORK", storeIds: seedStores.map((store) => store.id), active: true },
  { id: "user-clinical", name: "Profissional autorizado", email: "clinico@opticore.local", role: "CLINICAL_PROFESSIONAL", scope: "STORE", storeIds: ["store-centro"], active: true }
];

export class LocalSettingsRepository implements SettingsRepository {
  async get(): Promise<OrganizationSettings> {
    return (await database.settings.get("current")) ?? defaultSettings;
  }
  async save(settings: OrganizationSettings): Promise<void> {
    await database.settings.put(settings);
  }
}

export class LocalSessionRepository implements SessionRepository {
  async get(): Promise<LocalSession> {
    return (await database.sessions.get("current")) ?? defaultSession;
  }
  async save(session: LocalSession): Promise<void> {
    await database.sessions.put(session);
  }
}

export class LocalAdministrationRepository implements AdministrationRepository {
  async initialize(): Promise<void> {
    await database.transaction("rw", database.stores, database.users, database.currentStore, async () => {
      if (await database.stores.count() === 0) await database.stores.bulkAdd(seedStores);
      if (await database.users.count() === 0) await database.users.bulkAdd(seedUsers);
      if (!await database.currentStore.get("current")) await database.currentStore.add({ id: "current", storeId: "store-centro" });
    });
  }
  async listStores(): Promise<Store[]> { return database.stores.orderBy("name").toArray(); }
  async saveStore(store: Store): Promise<void> { await database.stores.put(store); }
  async listUsers(): Promise<User[]> { return database.users.orderBy("name").toArray(); }
  async saveUser(user: User): Promise<void> { await database.users.put(user); }
  async getCurrentStore(): Promise<CurrentStoreContext> { return (await database.currentStore.get("current"))!; }
  async saveCurrentStore(context: CurrentStoreContext): Promise<void> { await database.currentStore.put(context); }
}

export class LocalCustomerRepository implements CustomerRepository {
  async list(query = ""): Promise<Customer[]> {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    const customers = await database.customers.orderBy("name").toArray();
    return normalized ? customers.filter((customer) => [customer.name, customer.cpf, customer.phone].filter(Boolean).some((value) => value!.toLocaleLowerCase("pt-BR").includes(normalized))) : customers;
  }
  async get(id: string): Promise<Customer | undefined> { return database.customers.get(id); }
  async save(customer: Customer): Promise<void> { await database.customers.put(customer); }
}

export class LocalAttendanceRepository implements AttendanceRepository {
  async listByStore(storeId: string): Promise<Attendance[]> { return database.attendances.where("storeId").equals(storeId).reverse().sortBy("createdAt"); }
  async save(attendance: Attendance): Promise<void> { await database.attendances.put(attendance); }
}
