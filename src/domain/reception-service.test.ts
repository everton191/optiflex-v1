import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReceptionService } from "./reception-service";

const customers = { list: vi.fn(), get: vi.fn(), save: vi.fn() };
const attendances = { listByStore: vi.fn(), listByCustomer: vi.fn(), get: vi.fn(), save: vi.fn() };
const service = new ReceptionService(customers, attendances);
beforeEach(() => { vi.resetAllMocks(); });

describe("reception validation", () => {
  it("rejects blank names without saving", async () => {
    await expect(service.createCustomer({ name: "   " })).rejects.toThrow("Informe o nome");
    expect(customers.save).not.toHaveBeenCalled();
  });
  it("trims names and optional contact fields", async () => {
    const customer = await service.createCustomer({ name: "  Cliente  ", phone: "   ", cpf: "  " });
    expect(customer).toMatchObject({ name: "Cliente", phone: undefined, cpf: undefined });
    expect(customers.save).toHaveBeenCalledOnce();
  });
  it("rejects attendance without a store", async () => {
    await expect(service.startAttendance("customer", " ", "CONSULTATION")).rejects.toThrow("Selecione uma loja");
    expect(attendances.save).not.toHaveBeenCalled();
  });
  it("rejects a customer that does not exist", async () => {
    customers.get.mockResolvedValue(undefined);
    await expect(service.startAttendance("missing", "store", "CONSULTATION")).rejects.toThrow("cliente cadastrado");
    expect(attendances.save).not.toHaveBeenCalled();
  });
  it("preserves the selected customer and store", async () => {
    customers.get.mockResolvedValue({ id: "customer" });
    const attendance = await service.startAttendance("customer", "store", "RETURN");
    expect(attendance).toMatchObject({ customerId: "customer", storeId: "store", type: "RETURN", status: "WAITING", priority: "NORMAL" });
    expect(attendances.save).toHaveBeenCalledWith(attendance);
  });
  it("persists type, trimmed notes, professional and urgent priority", async () => {
    customers.get.mockResolvedValue({ id: "customer" });
    const attendance = await service.startAttendance("customer", "store", "ADJUSTMENT", "  cliente relatou dor  ", { professionalId: "  user-9  ", priority: "URGENT" });
    expect(attendance).toMatchObject({ type: "ADJUSTMENT", receptionNotes: "cliente relatou dor", professionalId: "user-9", priority: "URGENT", status: "WAITING" });
    expect(attendances.save).toHaveBeenCalledWith(attendance);
  });
});

describe("attendance lookup and transitions", () => {
  it("returns the stored attendance through the repository", async () => {
    const stored = { id: "attendance-1", customerId: "customer", storeId: "store", type: "CONSULTATION", status: "WAITING", createdAt: "2026-10-08T10:00:00.000Z" };
    attendances.get.mockResolvedValue(stored);
    expect(await service.getAttendance("attendance-1")).toEqual(stored);
    expect(attendances.get).toHaveBeenCalledWith("attendance-1");
  });
  it("rejects transitions for unknown attendances without saving", async () => {
    attendances.get.mockResolvedValue(undefined);
    await expect(service.transitionAttendance("missing", "IN_PROGRESS")).rejects.toThrow("não encontrado");
    expect(attendances.save).not.toHaveBeenCalled();
  });
  it("walks the happy path from waiting to in progress and finished", async () => {
    const stored = { id: "attendance-1", customerId: "customer", storeId: "store", type: "CONSULTATION", status: "WAITING", createdAt: "2026-10-08T10:00:00.000Z" };
    attendances.get.mockResolvedValue(stored);
    const started = await service.transitionAttendance("attendance-1", "IN_PROGRESS");
    expect(started.status).toBe("IN_PROGRESS");
    expect(attendances.save).toHaveBeenCalledWith({ ...stored, status: "IN_PROGRESS" });
    attendances.get.mockResolvedValue(started);
    const finished = await service.transitionAttendance("attendance-1", "FINISHED");
    expect(finished.status).toBe("FINISHED");
  });
  it("blocks invalid transitions such as reopening a closed attendance", async () => {
    const finished = { id: "attendance-1", customerId: "customer", storeId: "store", type: "CONSULTATION", status: "FINISHED", createdAt: "2026-10-08T10:00:00.000Z" };
    attendances.get.mockResolvedValue(finished);
    await expect(service.transitionAttendance("attendance-1", "WAITING")).rejects.toThrow("não permite esta transição");
    attendances.get.mockResolvedValue({ ...finished, status: "WAITING" });
    await expect(service.transitionAttendance("attendance-1", "FINISHED")).rejects.toThrow("não permite esta transição");
    expect(attendances.save).not.toHaveBeenCalled();
  });
});

describe("customer update", () => {
  const existing = { id: "customer-1", name: "Ana", phone: "119999", cpf: "111", createdAt: "2026-01-01T09:00:00.000Z" };
  it("rejects missing customers and blank names without saving", async () => {
    customers.get.mockResolvedValue(undefined);
    await expect(service.updateCustomer("missing", { name: "Ana" })).rejects.toThrow("Cliente não encontrado.");
    customers.get.mockResolvedValue(existing);
    await expect(service.updateCustomer("customer-1", { name: "   " })).rejects.toThrow("Informe o nome");
    expect(customers.save).not.toHaveBeenCalled();
  });
  it("trims fields, clears blanks and preserves id and createdAt", async () => {
    customers.get.mockResolvedValue(existing);
    const updated = await service.updateCustomer("customer-1", { name: "  Ana Maria  ", phone: "  ", cpf: " 222 ", email: " ana@exemplo.com ", birthDate: "1990-05-20" });
    expect(updated).toMatchObject({ id: "customer-1", createdAt: "2026-01-01T09:00:00.000Z", name: "Ana Maria", phone: undefined, cpf: "222", email: "ana@exemplo.com", birthDate: "1990-05-20" });
    expect(customers.save).toHaveBeenCalledOnce();
    expect(customers.save).toHaveBeenCalledWith(updated);
  });
});
