import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { database } from "./database";
import { defaultOrganization } from "../../domain/access";
import { LocalAdministrationRepository, LocalCustomerRepository, LocalAttendanceRepository } from "./local-repositories";
import { ReceptionService } from "../../domain/reception-service";

// This suite uses only the in-memory IndexedDB implementation, never browser data.
afterEach(async () => { await database.delete(); });

describe("local storage", () => {
  it("initializes and lists stores/users by name", async () => {
    await database.open();
    const repository = new LocalAdministrationRepository();
    await repository.initialize();
    expect((await repository.listStores()).map((store) => store.name)).toEqual(["Loja Centro", "Loja Shopping"]);
    expect(await repository.listUsers()).toHaveLength(2);
    await repository.initialize();
    expect(await database.stores.count()).toBe(2);
    for (const store of await repository.listStores()) expect(store.organizationId).toBe(defaultOrganization.id);
    for (const user of await repository.listUsers()) expect(user.organizationId).toBe(defaultOrganization.id);
  });

  it("upgrades version 8 without losing existing records or store selection", async () => {
    const legacy = new Dexie("opticore-v1");
    legacy.version(8).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt", clinicalRecords: "attendanceId, updatedAt", sales: "id, storeId, customerId, status, createdAt", workOrders: "id, saleId, storeId, customerId, status, createdAt", inventoryItems: "id, storeId, name", inventoryMovements: "id, itemId, storeId, type, createdAt", cashSessions: "id, storeId, openedAt, closedAt", cashEntries: "id, sessionId, storeId, saleId, type, createdAt" });
    try {
      await legacy.open();
      for (const table of legacy.tables) {
        await table.put({ id: table.name === "currentStore" ? "current" : "preserved", attendanceId: "preserved", name: "Registro existente", storeId: "preserved", role: "RECEPTIONIST", active: true });
      }
    } finally { legacy.close(); }
    await database.open();
    expect(database.verno).toBe(14);
    for (const table of database.tables) expect(await table.count()).toBe(["clinicalVersions", "attachments", "agendaEvents", "prescriptions"].includes(table.name) ? 0 : 1);
    const repository = new LocalAdministrationRepository();
    expect((await repository.listStores())[0].name).toBe("Registro existente");
    expect((await repository.listUsers())[0].role).toBe("RECEPTIONIST");
    expect((await repository.getCurrentStore()).storeId).toBe("preserved");
  });

  it("stamps organizationId on legacy records at version 14 without losing data", async () => {
    const legacy = new Dexie("opticore-v1");
    legacy.version(13).stores({ settings: "id", sessions: "id", stores: "id, active", users: "id, role, active", currentStore: "id, storeId", customers: "id, name, cpf, phone", attendances: "id, storeId, customerId, status, createdAt", clinicalRecords: "attendanceId, updatedAt", clinicalVersions: "id, attendanceId, finalizedAt", sales: "id, storeId, customerId, status, createdAt", workOrders: "id, saleId, storeId, customerId, status, createdAt", inventoryItems: "id, storeId, name", inventoryMovements: "id, itemId, storeId, type, createdAt", cashSessions: "id, storeId, openedAt, closedAt", cashEntries: "id, sessionId, storeId, saleId, type, createdAt", attachments: "id", agendaEvents: "id, storeId, professionalId, status, startsAt", prescriptions: "id, attendanceId, customerId, storeId, issuedAt" });
    try {
      await legacy.open();
      await legacy.table("customers").put({ id: "customer-legacy", name: "Cliente antigo" });
      await legacy.table("sales").put({ id: "sale-legacy", storeId: "store-centro", customerId: "customer-legacy", status: "CONFIRMED", total: 1000, createdAt: "2026-01-01T00:00:00.000Z" });
    } finally { legacy.close(); }
    await database.open();
    expect(database.verno).toBe(14);
    const customer = await database.customers.get("customer-legacy");
    expect(customer?.name).toBe("Cliente antigo");
    expect(customer?.organizationId).toBe(defaultOrganization.id);
    const sale = await database.sales.get("sale-legacy");
    expect(sale?.total).toBe(1000);
    expect(sale?.organizationId).toBe(defaultOrganization.id);
  });

  it("persists the customer and keeps the attendance in its original store after reopening", async () => {
    await database.open();
    const service = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
    const customer = await service.createCustomer({ name: "Cliente de teste" });
    const attendance = await service.startAttendance(customer.id, "store-centro", "ADJUSTMENT", "  observação da recepção  ", { professionalId: "user-clinical", priority: "URGENT" });
    expect(customer.organizationId).toBe(defaultOrganization.id);
    expect(attendance.organizationId).toBe(defaultOrganization.id);
    database.close();
    await database.open();
    expect(await service.getCustomer(customer.id)).toEqual(customer);
    expect(await service.getAttendance(attendance.id)).toEqual(attendance);
    expect(await service.listQueue("store-centro")).toEqual([attendance]);
    expect(await service.listQueue("store-shopping")).toEqual([]);
  });
});
