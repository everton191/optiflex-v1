import type { CurrentStoreContext, LocalSession, OrganizationSettings, Store, User } from "./access";
import type { Attendance, Customer } from "./customer";
import type { ClinicalRecord } from "./clinical";
import type { Sale } from "./sales";
import type { WorkOrder } from "./work-order";

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
  get(attendanceId: string): Promise<ClinicalRecord | undefined>;
  save(record: ClinicalRecord): Promise<void>;
}

export interface SaleRepository {
  listByStore(storeId: string): Promise<Sale[]>;
  save(sale: Sale): Promise<void>;
}

export interface WorkOrderRepository {
  listByStore(storeId: string): Promise<WorkOrder[]>;
  getBySale(saleId: string): Promise<WorkOrder | undefined>;
  save(order: WorkOrder): Promise<void>;
}
