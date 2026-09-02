import Dexie, { type EntityTable } from "dexie";
import type { CurrentStoreContext, LocalSession, OrganizationSettings, Store, User } from "../../domain/access";
import type { Attendance, Customer } from "../../domain/customer";
import type { ClinicalRecord } from "../../domain/clinical";
import type { Sale } from "../../domain/sales";
import type { WorkOrder } from "../../domain/work-order";
import type { InventoryItem, InventoryMovement } from "../../domain/inventory";

export class OpticoreDatabase extends Dexie {
  settings!: EntityTable<OrganizationSettings, "id">;
  sessions!: EntityTable<LocalSession, "id">;
  stores!: EntityTable<Store, "id">;
  users!: EntityTable<User, "id">;
  currentStore!: EntityTable<CurrentStoreContext, "id">;
  customers!: EntityTable<Customer, "id">;
  attendances!: EntityTable<Attendance, "id">;
  clinicalRecords!: EntityTable<ClinicalRecord, "attendanceId">;
  sales!: EntityTable<Sale, "id">;
  workOrders!: EntityTable<WorkOrder, "id">;
  inventoryItems!: EntityTable<InventoryItem, "id">;
  inventoryMovements!: EntityTable<InventoryMovement, "id">;

  constructor() {
    super("opticore-v1");
    this.version(1).stores({ settings: "id", sessions: "id" });
    this.version(2).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId" });
    this.version(3).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt" });
    this.version(4).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt", clinicalRecords: "attendanceId, updatedAt" });
    this.version(5).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt", clinicalRecords: "attendanceId, updatedAt", sales: "id, storeId, customerId, status, createdAt" });
    this.version(6).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt", clinicalRecords: "attendanceId, updatedAt", sales: "id, storeId, customerId, status, createdAt", workOrders: "id, saleId, storeId, customerId, status, createdAt" });
    this.version(7).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt", clinicalRecords: "attendanceId, updatedAt", sales: "id, storeId, customerId, status, createdAt", workOrders: "id, saleId, storeId, customerId, status, createdAt", inventoryItems: "id, storeId, name", inventoryMovements: "id, itemId, storeId, type, createdAt" });
  }
}

export const database = new OpticoreDatabase();
