import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReceptionService } from "./reception-service";

const customers = { list: vi.fn(), get: vi.fn(), save: vi.fn() };
const attendances = { listByStore: vi.fn(), listByCustomer: vi.fn(), save: vi.fn() };
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
    expect(attendance).toMatchObject({ customerId: "customer", storeId: "store", type: "RETURN", status: "WAITING" });
    expect(attendances.save).toHaveBeenCalledWith(attendance);
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
