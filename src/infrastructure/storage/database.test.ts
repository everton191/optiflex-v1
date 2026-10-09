import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { database } from "./database";
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
    expect(database.verno).toBe(11);
    for (const table of database.tables) expect(await table.count()).toBe(table.name === "clinicalVersions" || table.name === "attachments" ? 0 : 1);
    const repository = new LocalAdministrationRepository();
    expect((await repository.listStores())[0].name).toBe("Registro existente");
    expect((await repository.listUsers())[0].role).toBe("RECEPTIONIST");
    expect((await repository.getCurrentStore()).storeId).toBe("preserved");
  });

  it("persists the customer and keeps the attendance in its original store after reopening", async () => {
    await database.open();
    const service = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
    const customer = await service.createCustomer({ name: "Cliente de teste" });
    const attendance = await service.startAttendance(customer.id, "store-centro", "CONSULTATION");
    database.close();
    await database.open();
    expect(await service.getCustomer(customer.id)).toEqual(customer);
    expect(await service.listQueue("store-centro")).toEqual([attendance]);
    expect(await service.listQueue("store-shopping")).toEqual([]);
  });
});
