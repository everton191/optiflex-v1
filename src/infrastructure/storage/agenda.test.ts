import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { database } from "./database";
import { LocalAdministrationRepository, LocalAgendaRepository, LocalAttendanceRepository, LocalCustomerRepository } from "./local-repositories";
import { AgendaService } from "../../domain/agenda-service";
import { ReceptionService } from "../../domain/reception-service";

const reception = new ReceptionService(new LocalCustomerRepository(), new LocalAttendanceRepository());
const service = new AgendaService(new LocalAgendaRepository(), new LocalCustomerRepository(), reception);
let customerId: string;
beforeEach(async () => {
  await database.open(); await new LocalAdministrationRepository().initialize();
  customerId = (await reception.createCustomer({ name: "Cliente agenda" })).id;
});
afterEach(async () => { await database.delete(); });

describe("agenda persistence", () => {
  it("keeps an event on the correct local day after reopening", async () => {
    const start = new Date(2026, 9, 8, 10, 0);
    const created = await service.createEvent({ storeId: "store-centro", customerId, type: "CONSULTATION", startsAt: start.toISOString() });
    database.close(); await database.open();
    const day = await service.listDay("store-centro", new Date(2026, 9, 8));
    expect(day.map((event) => event.id)).toEqual([created.id]);
    expect(await service.listDay("store-centro", new Date(2026, 9, 9))).toHaveLength(0);
    const week = await service.listWeek("store-centro", new Date(2026, 9, 8));
    expect(week.map((event) => event.id)).toEqual([created.id]);
  });
  it("converts an event into a queue attendance reusing the customer", async () => {
    const created = await service.createEvent({ storeId: "store-centro", customerId, type: "CONSULTATION", startsAt: new Date(2026, 9, 8, 10, 0).toISOString() });
    const { event, attendance } = await service.convertToAttendance(created.id);
    expect(attendance).toMatchObject({ customerId, storeId: "store-centro", status: "WAITING", type: "CONSULTATION" });
    expect(event).toMatchObject({ status: "COMPLETED", attendanceId: attendance.id });
    database.close(); await database.open();
    expect((await service.listDay("store-centro", new Date(2026, 9, 8)))[0]).toMatchObject({ status: "COMPLETED", attendanceId: attendance.id });
    expect((await reception.listQueue("store-centro")).map((item) => item.id)).toContain(attendance.id);
  });
  it("filters events by store", async () => {
    await service.createEvent({ storeId: "store-centro", customerId, type: "RETURN", startsAt: new Date(2026, 9, 8, 10, 0).toISOString() });
    expect(await service.listDay("store-shopping", new Date(2026, 9, 8))).toHaveLength(0);
    expect(await service.listDay("store-centro", new Date(2026, 9, 8))).toHaveLength(1);
  });
});
