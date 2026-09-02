import type { CurrentStoreContext, LocalSession, OrganizationSettings, Store, User } from "../../domain/access";
import type { Attendance, Customer } from "../../domain/customer";
import type { ClinicalRecord } from "../../domain/clinical";
import type { Sale } from "../../domain/sales";
import type { WorkOrder } from "../../domain/work-order";
import type { InventoryItem, InventoryMovement } from "../../domain/inventory";
import type { CashEntry, CashSession } from "../../domain/cash";
import type { AdministrationRepository, AttendanceRepository, CashRepository, ClinicalRepository, CustomerRepository, InventoryRepository, SaleRepository, SessionRepository, SettingsRepository, WorkOrderRepository } from "../../domain/repositories";
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
  async listByCustomer(customerId: string): Promise<Attendance[]> { return database.attendances.where("customerId").equals(customerId).reverse().sortBy("createdAt"); }
  async save(attendance: Attendance): Promise<void> { await database.attendances.put(attendance); }
}

export class LocalClinicalRepository implements ClinicalRepository {
  async get(attendanceId: string): Promise<ClinicalRecord | undefined> { return database.clinicalRecords.get(attendanceId); }
  async save(record: ClinicalRecord): Promise<void> { await database.clinicalRecords.put(record); }
}

export class LocalSaleRepository implements SaleRepository {
  async listByStore(storeId: string): Promise<Sale[]> { return database.sales.where("storeId").equals(storeId).reverse().sortBy("createdAt"); }
  async save(sale: Sale): Promise<void> { await database.sales.put(sale); }
}

export class LocalWorkOrderRepository implements WorkOrderRepository {
  async listByStore(storeId: string): Promise<WorkOrder[]> { return database.workOrders.where("storeId").equals(storeId).reverse().sortBy("createdAt"); }
  async getBySale(saleId: string): Promise<WorkOrder | undefined> { return database.workOrders.where("saleId").equals(saleId).first(); }
  async save(order: WorkOrder): Promise<void> { await database.workOrders.put(order); }
}

export class LocalInventoryRepository implements InventoryRepository {
  async listByStore(storeId: string): Promise<InventoryItem[]> { return database.inventoryItems.where("storeId").equals(storeId).sortBy("name"); }
  async saveItem(item: InventoryItem): Promise<void> { await database.inventoryItems.put(item); }
  async addMovement(movement: InventoryMovement): Promise<void> { await database.inventoryMovements.put(movement); }
}

export class LocalCashRepository implements CashRepository {
  async current(storeId: string): Promise<CashSession | undefined> { return database.cashSessions.where("storeId").equals(storeId).filter((session) => !session.closedAt).first(); }
  async saveSession(session: CashSession): Promise<void> { await database.cashSessions.put(session); }
  async addEntry(entry: CashEntry): Promise<void> { await database.cashEntries.put(entry); }
}
