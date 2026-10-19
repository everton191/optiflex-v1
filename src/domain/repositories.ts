import type { CurrentStoreContext, LocalSession, OrganizationSettings, Store, User } from "./access";
import type { Transfer } from "./transfer";
import type { AgendaEvent } from "./agenda";
import type { Attendance, Customer } from "./customer";
import type { ClinicalRecord, ClinicalVersion, Prescription } from "./clinical";
import type { Sale } from "./sales";
import type { WorkOrder, WorkOrderStatus } from "./work-order";
import type { InventoryItem, InventoryMovement } from "./inventory";
import type { CashEntry, CashSession } from "./cash";
import type { ServiceCatalogItem } from "./service-catalog";

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
  get(id: string): Promise<Attendance | undefined>;
  save(attendance: Attendance): Promise<void>;
}

export interface AgendaRepository {
  listByStoreAndRange(storeId: string, from: string, to: string): Promise<AgendaEvent[]>;
  get(id: string): Promise<AgendaEvent | undefined>;
  save(event: AgendaEvent): Promise<void>;
}

export interface ClinicalRepository {
  load(attendanceId: string, storeId: string): Promise<{ record: ClinicalRecord; customer: Customer }>;
  write(record: ClinicalRecord, storeId: string, author: string, action: "save" | "finalize" | "amend", reason?: string): Promise<ClinicalRecord>;
  history(attendanceId: string, storeId: string): Promise<ClinicalVersion[]>;
  putAttachmentContent(attachmentId: string, content: string): Promise<void>;
  getAttachmentContent(attachmentId: string): Promise<string | undefined>;
  deleteAttachmentContent(attachmentId: string): Promise<void>;
}

// Append-only: versions are stored next to each other so retification never rewrites the original.
export interface PrescriptionRepository {
  listByAttendance(attendanceId: string, storeId: string): Promise<Prescription[]>;
  get(id: string, storeId: string): Promise<Prescription | undefined>;
  listByCustomer(customerId: string, storeId: string): Promise<Prescription[]>;
  save(prescription: Prescription, storeId: string): Promise<Prescription>;
}

export interface SaleRepository {
  listByStore(storeId: string): Promise<Sale[]>;
  get(id: string): Promise<Sale | undefined>;
  save(sale: Sale): Promise<void>;
  confirm(sale: Sale, movements: readonly InventoryMovement[]): Promise<void>;
  cancel(sale: Sale, movements: readonly InventoryMovement[]): Promise<void>;
}

export interface WorkOrderRepository {
  listByStore(storeId: string): Promise<WorkOrder[]>;
  getBySale(saleId: string): Promise<WorkOrder | undefined>;
  create(order: WorkOrder): Promise<WorkOrder>;
  update(order: WorkOrder, expectedStatus?: WorkOrderStatus): Promise<WorkOrder>;
  recordInputs(order: WorkOrder, movements: readonly InventoryMovement[], expectedStatus: WorkOrderStatus): Promise<WorkOrder>;
}

export interface InventoryRepository {
  listByStore(storeId: string): Promise<InventoryItem[]>;
  listMovements(storeId: string): Promise<InventoryMovement[]>;
  createItem(item: InventoryItem, initialMovement?: InventoryMovement): Promise<void>;
  createMany(items: InventoryItem[], initialMovements: InventoryMovement[]): Promise<void>;
  updateItem(item: InventoryItem): Promise<void>;
  applyMovement(movement: InventoryMovement): Promise<InventoryItem>;
  applyReservation(itemId: string, storeId: string, delta: number): Promise<InventoryItem>;
}

export interface TransferRepository {
  listByStore(storeId: string): Promise<Transfer[]>;
  create(transfer: Transfer): Promise<Transfer>;
  separate(id: string, actor: string, at: string): Promise<Transfer>;
  markInTransit(id: string, actor: string, at: string): Promise<Transfer>;
  receive(id: string, actor: string, at: string): Promise<Transfer>;
  cancel(id: string, actor: string, at: string, reason: string): Promise<Transfer>;
}

export interface ServiceCatalogRepository {
  listByStore(storeId: string): Promise<ServiceCatalogItem[]>;
  create(item: ServiceCatalogItem): Promise<ServiceCatalogItem>;
  update(item: ServiceCatalogItem): Promise<ServiceCatalogItem>;
  remove(id: string): Promise<void>;
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
  recordMovement(entry: CashEntry): Promise<CashEntry>;
  closeSession(storeId: string, input: CashCloseInput): Promise<CashSession>;
}
