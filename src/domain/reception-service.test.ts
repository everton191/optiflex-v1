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
