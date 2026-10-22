import Dexie, { type EntityTable } from "dexie";
import { defaultOrganization, type CurrentStoreContext, type LocalSession, type OrganizationSettings, type Store, type User } from "../../domain/access";
import type { AgendaEvent } from "../../domain/agenda";
import type { Attendance, Customer } from "../../domain/customer";
import type { ClinicalAttachmentContent, ClinicalRecord, ClinicalVersion, Prescription } from "../../domain/clinical";
import type { Sale } from "../../domain/sales";
import type { WorkOrder } from "../../domain/work-order";
import type { InventoryItem, InventoryMovement } from "../../domain/inventory";
import type { CashEntry, CashSession } from "../../domain/cash";
import type { AuditEntry } from "../../domain/audit";
import type { Transfer } from "../../domain/transfer";
import type { ServiceCatalogItem } from "../../domain/service-catalog";
import type { Supplier } from "../../domain/supplier";

export class OpticoreDatabase extends Dexie {
  settings!: EntityTable<OrganizationSettings, "id">;
  sessions!: EntityTable<LocalSession, "id">;
  stores!: EntityTable<Store, "id">;
  users!: EntityTable<User, "id">;
  currentStore!: EntityTable<CurrentStoreContext, "id">;
  customers!: EntityTable<Customer, "id">;
  attendances!: EntityTable<Attendance, "id">;
  agendaEvents!: EntityTable<AgendaEvent, "id">;
  clinicalRecords!: EntityTable<ClinicalRecord, "attendanceId">;
  clinicalVersions!: EntityTable<ClinicalVersion, "id">;
  prescriptions!: EntityTable<Prescription, "id">;
  attachments!: EntityTable<ClinicalAttachmentContent, "id">;
  sales!: EntityTable<Sale, "id">;
  workOrders!: EntityTable<WorkOrder, "id">;
  inventoryItems!: EntityTable<InventoryItem, "id">;
  inventoryMovements!: EntityTable<InventoryMovement, "id">;
  cashSessions!: EntityTable<CashSession, "id">;
  cashEntries!: EntityTable<CashEntry, "id">;
  auditEntries!: EntityTable<AuditEntry, "id">;
  transfers!: EntityTable<Transfer, "id">;
  services!: EntityTable<ServiceCatalogItem, "id">;
  suppliers!: EntityTable<Supplier, "id">;

  constructor() {
    super("opticore-v1");
    this.version(1).stores({ settings: "id", sessions: "id" });
    this.version(2).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId" });
    this.version(3).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt" });
    this.version(4).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt", clinicalRecords: "attendanceId, updatedAt" });
    this.version(5).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt", clinicalRecords: "attendanceId, updatedAt", sales: "id, storeId, customerId, status, createdAt" });
    this.version(6).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt", clinicalRecords: "attendanceId, updatedAt", sales: "id, storeId, customerId, status, createdAt", workOrders: "id, saleId, storeId, customerId, status, createdAt" });
    this.version(7).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt", clinicalRecords: "attendanceId, updatedAt", sales: "id, storeId, customerId, status, createdAt", workOrders: "id, saleId, storeId, customerId, status, createdAt", inventoryItems: "id, storeId, name", inventoryMovements: "id, itemId, storeId, type, createdAt" });
    this.version(8).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt", clinicalRecords: "attendanceId, updatedAt", sales: "id, storeId, customerId, status, createdAt", workOrders: "id, saleId, storeId, customerId, status, createdAt", inventoryItems: "id, storeId, name", inventoryMovements: "id, itemId, storeId, type, createdAt", cashSessions: "id, storeId, openedAt, closedAt", cashEntries: "id, sessionId, storeId, saleId, type, createdAt" });
    this.version(9).stores({ stores: "id, name, active", users: "id, name, role, active" });
    this.version(10).stores({ clinicalVersions: "id, attendanceId, finalizedAt" }).upgrade(async (transaction) => {
      const records = await transaction.table("clinicalRecords").toArray() as ClinicalRecord[];
      for (const record of records) {
        if (!record.finalizedAt) continue;
        await transaction.table("clinicalVersions").put({ ...record, version: record.version ?? 1, id: `${record.attendanceId}:${record.version ?? 1}` });
        const attendance = await transaction.table("attendances").get(record.attendanceId);
        if (attendance && attendance.status !== "CANCELLED") await transaction.table("attendances").update(record.attendanceId, { status: "FINISHED" });
      }
    });
    this.version(11).stores({ attachments: "id" });
    this.version(12).stores({ agendaEvents: "id, storeId, professionalId, status, startsAt" });
    this.version(13).stores({ prescriptions: "id, attendanceId, customerId, storeId, issuedAt" });
    this.version(14).upgrade(async (transaction) => {
      const organizationTables = ["stores", "users", "customers", "attendances", "agendaEvents", "clinicalRecords", "clinicalVersions", "prescriptions", "sales", "workOrders", "inventoryItems", "inventoryMovements", "cashSessions", "cashEntries"];
      for (const name of organizationTables) {
        await transaction.table(name).toCollection().modify((record: { organizationId?: string }) => { record.organizationId ??= defaultOrganization.id; });
      }
    });
    this.version(15).stores({ auditEntries: "id, storeId, action, entity, entityId, at" });
    this.version(16).stores({ transfers: "id, fromStoreId, toStoreId, status, createdAt" });
    this.version(17).stores({ services: "id, storeId, name" });
    this.version(18).stores({ suppliers: "id, name, active, kind" });
  }
}

export const database = new OpticoreDatabase();
