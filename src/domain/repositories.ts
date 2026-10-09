import type { CurrentStoreContext, LocalSession, OrganizationSettings, Store, User } from "./access";
import type { Attendance, Customer } from "./customer";
import type { ClinicalRecord, ClinicalVersion } from "./clinical";
import type { Sale } from "./sales";
import type { WorkOrder, WorkOrderStatus } from "./work-order";
import type { InventoryItem, InventoryMovement } from "./inventory";
import type { CashEntry, CashSession } from "./cash";

export interface SettingsRepository {
  get(): Promise<OrganizationSettings>;
  save(settings: OrganizationSettings): Promise<void>;
}

export interface SessionRepository {
  get(): Promise<LocalSession | null>;
  save(session: LocalSession): Promise<void>;
  clear(): Promise<void>;
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
  confirm(sale: Sale, movements: readonly InventoryMovement[]): Promise<void>;
}

export interface WorkOrderRepository {
  listByStore(storeId: string): Promise<WorkOrder[]>;
  getBySale(saleId: string): Promise<WorkOrder | undefined>;
  create(order: WorkOrder): Promise<WorkOrder>;
  update(order: WorkOrder, expectedStatus?: WorkOrderStatus): Promise<WorkOrder>;
}

export interface InventoryRepository {
  listByStore(storeId: string): Promise<InventoryItem[]>;
  listMovements(storeId: string): Promise<InventoryMovement[]>;
  createItem(item: InventoryItem, initialMovement?: InventoryMovement): Promise<void>;
  updateItem(item: InventoryItem): Promise<void>;
  applyMovement(movement: InventoryMovement): Promise<InventoryItem>;
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
