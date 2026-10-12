import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgendaService } from "./agenda-service";
import { dayRange, weekRange } from "./agenda";
import type { ReceptionService } from "./reception-service";

const events = { listByStoreAndRange: vi.fn(), get: vi.fn(), save: vi.fn() };
const customers = { list: vi.fn(), get: vi.fn(), save: vi.fn() };
const reception = { startAttendance: vi.fn() } as unknown as ReceptionService;
const service = new AgendaService(events, customers, reception);
const startAttendance = vi.mocked(reception.startAttendance);
beforeEach(() => { vi.resetAllMocks(); });

describe("agenda date ranges", () => {
  it("builds local day and Monday-based week ranges", () => {
    const day = new Date(2026, 9, 8, 15, 30);
    const dayLimits = dayRange(day);
    expect(new Date(dayLimits.from).getHours()).toBe(0);
    expect(new Date(dayLimits.to).getDate()).toBe(9);
    const week = weekRange(day);
    expect(new Date(week.from).getDay()).toBe(1);
    expect(new Date(week.to).getDate() - new Date(week.from).getDate()).toBe(7);
  });
});

describe("agenda service", () => {
  it("rejects a missing store, customer or date without saving", async () => {
    await expect(service.createEvent({ storeId: " ", customerId: "customer", type: "CONSULTATION", startsAt: "2026-10-08T10:00" })).rejects.toThrow("Selecione uma loja");
    customers.get.mockResolvedValue(undefined);
    await expect(service.createEvent({ storeId: "store", customerId: "missing", type: "CONSULTATION", startsAt: "2026-10-08T10:00" })).rejects.toThrow("cliente cadastrado");
    customers.get.mockResolvedValue({ id: "customer" });
    await expect(service.createEvent({ storeId: "store", customerId: "customer", type: "CONSULTATION", startsAt: "not-a-date" })).rejects.toThrow("data e hora");
    expect(events.save).not.toHaveBeenCalled();
  });
  it("creates a scheduled event with trimmed optional fields", async () => {
    customers.get.mockResolvedValue({ id: "customer" });
    const event = await service.createEvent({ storeId: "store", customerId: "customer", professionalId: "  ", type: "DELIVERY", startsAt: "2026-10-08T10:00", notes: " trago " });
    expect(event).toMatchObject({ storeId: "store", customerId: "customer", professionalId: undefined, type: "DELIVERY", status: "SCHEDULED", notes: "trago" });
    expect(events.save).toHaveBeenCalledWith(event);
  });
  it("lists day and week through the repository range", async () => {
    events.listByStoreAndRange.mockResolvedValue([]);
    await service.listDay("store", new Date(2026, 9, 8));
    expect(events.listByStoreAndRange).toHaveBeenCalledWith("store", expect.any(String), expect.any(String));
    await service.listWeek("store", new Date(2026, 9, 8));
    expect(events.listByStoreAndRange).toHaveBeenCalledTimes(2);
  });
  it("converts only scheduled convertible events into attendance without redigiting the customer", async () => {
    const scheduled = { id: "agenda-1", storeId: "store", customerId: "customer", professionalId: "user-9", type: "RETURN", status: "SCHEDULED", startsAt: "2026-10-08T10:00:00.000Z", notes: "retorno", createdAt: "2026-10-01T10:00:00.000Z" };
    events.get.mockResolvedValue(scheduled);
    startAttendance.mockResolvedValue({ id: "attendance-1", customerId: "customer", status: "WAITING" } as never);
    const { event, attendance } = await service.convertToAttendance("agenda-1");
    expect(startAttendance).toHaveBeenCalledWith("customer", "store", "RETURN", "retorno", { professionalId: "user-9" });
    expect(attendance.id).toBe("attendance-1");
    expect(event).toMatchObject({ status: "COMPLETED", attendanceId: "attendance-1" });
    expect(events.save).toHaveBeenCalledWith(event);
  });
  it("rejects missing, processed, cancelled or non-convertible events", async () => {
    events.get.mockResolvedValue(undefined);
    await expect(service.convertToAttendance("missing")).rejects.toThrow("não encontrado");
    events.get.mockResolvedValue({ id: "x", status: "COMPLETED" });
    await expect(service.convertToAttendance("x")).rejects.toThrow("agendados");
    events.get.mockResolvedValue({ id: "x", status: "CANCELLED" });
    await expect(service.convertToAttendance("x")).rejects.toThrow("agendados");
    events.get.mockResolvedValue({ id: "x", status: "SCHEDULED", type: "BILLING" });
    await expect(service.convertToAttendance("x")).rejects.toThrow("não vira atendimento");
    expect(startAttendance).not.toHaveBeenCalled();
    expect(events.save).not.toHaveBeenCalled();
  });
  it("cancels only scheduled events", async () => {
    events.get.mockResolvedValue({ id: "x", status: "COMPLETED" });
    await expect(service.cancel("x")).rejects.toThrow("agendados");
    events.get.mockResolvedValue({ id: "x", status: "SCHEDULED" });
    const cancelled = await service.cancel("x");
    expect(cancelled.status).toBe("CANCELLED");
    expect(events.save).toHaveBeenCalledWith(cancelled);
  });
});
