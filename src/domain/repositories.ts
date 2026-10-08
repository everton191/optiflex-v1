import type { CurrentStoreContext, LocalSession, OrganizationSettings, Store, User } from "./access";
import type { Attendance, Customer } from "./customer";
import type { ClinicalRecord, ClinicalVersion } from "./clinical";
import type { Sale } from "./sales";
import type { WorkOrder } from "./work-order";
import type { InventoryItem, InventoryMovement } from "./inventory";
import type { CashEntry, CashSession } from "./cash";

export interface SettingsRepository {
  get(): Promise<OrganizationSettings>;
  save(settings: OrganizationSettings): Promise<void>;
}

export interface SessionRepository {
  get(): Promise<LocalSession>;
  save(session: LocalSession): Promise<void>;
}

export interface AdministrationRepository {
  initialize(): Promise<void>;
  listStores(): Promise<Store[]>;
  saveStore(store: Store): Promise<void>;
  listUsers(): Promise<User[]>;
  saveUser(user: User): Promise<void>;
  getCurrentStore(): Promise<CurrentStoreContext>;
  saveCurrentStore(context: CurrentStoreContext): Promise<void>;
}

export interface CustomerRepository {
  list(query?: string): Promise<Customer[]>;
  get(id: string): Promise<Customer | undefined>;
  save(customer: Customer): Promise<void>;
}

export interface AttendanceRepository {
  listByStore(storeId: string): Promise<Attendance[]>;
  listByCustomer(customerId: string): Promise<Attendance[]>;
  save(attendance: Attendance): Promise<void>;
}

export interface ClinicalRepository {
  load(attendanceId: string, storeId: string): Promise<{ record: ClinicalRecord; customer: Customer }>;
  write(record: ClinicalRecord, storeId: string, author: string, action: "save" | "finalize" | "amend", reason?: string): Promise<ClinicalRecord>;
  history(attendanceId: string, storeId: string): Promise<ClinicalVersion[]>;
}

export interface SaleRepository {
  listByStore(storeId: string): Promise<Sale[]>;
  get(id: string): Promise<Sale | undefined>;
  save(sale: Sale): Promise<void>;
}

export interface WorkOrderRepository {
  listByStore(storeId: string): Promise<WorkOrder[]>;
  getBySale(saleId: string): Promise<WorkOrder | undefined>;
  save(order: WorkOrder): Promise<void>;
}

export interface InventoryRepository {
  listByStore(storeId: string): Promise<InventoryItem[]>;
  saveItem(item: InventoryItem): Promise<void>;
  addMovement(movement: InventoryMovement): Promise<void>;
}

export interface CashCloseInput {
  closingBalance: number;
  closedBy?: string;
  note?: string;
}

export interface CashRepository {
  current(storeId: string): Promise<CashSession | undefined>;
  listSessions(storeId: string): Promise<CashSession[]>;
  listEntries(storeId: string): Promise<CashEntry[]>;
  openSession(session: CashSession): Promise<CashSession>;
  recordReceipt(entry: CashEntry): Promise<CashEntry>;
  closeSession(storeId: string, input: CashCloseInput): Promise<CashSession>;
}
