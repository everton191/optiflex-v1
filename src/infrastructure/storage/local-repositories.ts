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
  private async attendance(attendanceId: string, storeId: string) {
    const attendance = await database.attendances.get(attendanceId);
    if (!attendance || attendance.storeId !== storeId) throw new Error("Atendimento não encontrado nesta loja.");
    if (attendance.status === "CANCELLED") throw new Error("Este atendimento foi cancelado.");
    return attendance;
  }
  async load(attendanceId: string, storeId: string) {
    return database.transaction("r", database.attendances, database.customers, database.clinicalRecords, async () => {
      const attendance = await this.attendance(attendanceId, storeId);
      const customer = await database.customers.get(attendance.customerId);
      if (!customer) throw new Error("Cliente do atendimento não encontrado.");
      const record = await database.clinicalRecords.get(attendanceId) ?? { attendanceId, anamnesis: "", examination: "", prescription: "", requests: "", attachments: [], revision: 0, version: 1, updatedAt: "" };
      return { record, customer };
    });
  }
  async write(input: ClinicalRecord, storeId: string, author: string, action: "save" | "finalize" | "amend", reason?: string): Promise<ClinicalRecord> {
    return database.transaction("rw", database.attendances, database.clinicalRecords, database.clinicalVersions, async () => {
      const attendance = await this.attendance(input.attendanceId, storeId);
      const current = await database.clinicalRecords.get(input.attendanceId);
      if ((current?.revision ?? 0) !== (input.revision ?? 0) || (current?.updatedAt ?? "") !== input.updatedAt) throw new Error("Este atendimento mudou em outra aba. Reabra a consulta antes de continuar; seu texto ainda está nesta tela.");
      if (action === "amend") {
        if (!current?.finalizedAt || !reason?.trim()) throw new Error("A correção exige um documento finalizado e um motivo.");
        const version = current.version ?? 1;
        const versionId = `${current.attendanceId}:${version}`;
        if (!await database.clinicalVersions.get(versionId)) await database.clinicalVersions.add({ ...current, version, id: versionId, finalizedAt: current.finalizedAt });
        const amended = { ...current, finalizedAt: undefined, version: version + 1, revision: (current.revision ?? 0) + 1, author, amendmentReason: reason.trim(), updatedAt: new Date().toISOString() };
        await database.clinicalRecords.put(amended);
        return amended;
      }
      if (current?.finalizedAt || input.finalizedAt) throw new Error("Documento finalizado: crie uma correção para preservar o original.");
      if (attendance.status === "FINISHED" && !current?.amendmentReason) throw new Error("Este atendimento já foi concluído.");
      if (action === "finalize" && !input.prescription.trim()) throw new Error("Preencha a prescrição antes de finalizar.");
      const now = new Date().toISOString();
      const saved: ClinicalRecord = { ...input, version: current?.version ?? 1, amendmentReason: current?.amendmentReason, revision: (current?.revision ?? 0) + 1, author, updatedAt: now, finalizedAt: action === "finalize" ? now : undefined };
      await database.clinicalRecords.put(saved);
      if (action === "finalize") {
        await database.clinicalVersions.add({ ...saved, id: `${saved.attendanceId}:${saved.version}`, finalizedAt: now });
        await database.attendances.update(saved.attendanceId, { status: "FINISHED" });
      } else if (attendance.status === "WAITING" || attendance.status === "DRAFT") {
        await database.attendances.update(saved.attendanceId, { status: "IN_PROGRESS" });
      }
      return saved;
    });
  }
  async history(attendanceId: string, storeId: string) {
    return database.transaction("r", database.attendances, database.clinicalVersions, async () => {
      await this.attendance(attendanceId, storeId);
      return database.clinicalVersions.where("attendanceId").equals(attendanceId).reverse().sortBy("version");
    });
  }
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
