import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { database } from "./database";
import { LocalCashRepository, LocalSaleRepository } from "./local-repositories";
import { CashService } from "../../domain/cash-service";
import type { Sale } from "../../domain/sales";

// This suite uses only the in-memory IndexedDB implementation, never browser data.
afterEach(async () => { await database.delete(); });

const repository = new LocalCashRepository();
const sales = new LocalSaleRepository();
const service = new CashService(repository, sales);
const sale = (overrides: Partial<Sale> = {}): Sale => ({ id: "sale-1", customerId: "customer-1", storeId: "store-centro", status: "CONFIRMED", description: "Armação Ray-Ban", total: 300, createdAt: "2026-01-01T11:00:00.000Z", ...overrides });

describe("cash session flow", () => {
  it("opens once per store and keeps the active session after reopening the database", async () => {
    await database.open();
    const opened = await service.open("store-centro", 100);
    await expect(service.open("store-centro", 50)).rejects.toThrow("Já existe um caixa aberto nesta loja.");
    const concurrent = await Promise.allSettled([service.open("store-shopping", 10), service.open("store-shopping", 20)]);
    expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === "rejected")).toHaveLength(1);
    database.close();
    await database.open();
    expect(await repository.current("store-centro")).toMatchObject({ id: opened.id, openingBalance: 100 });
    expect(await repository.current("store-shopping")).toBeDefined();
  });

  it("receives a payment durably and keeps the sale status consistent", async () => {
    await database.open();
    await sales.save(sale());
    await service.open("store-centro", 100);
    const entry = await service.receive("store-centro", "sale-1", 300);
    expect(entry).toMatchObject({ saleId: "sale-1", type: "RECEIPT", amount: 300, sessionId: (await repository.current("store-centro"))!.id });
    expect(await sales.get("sale-1")).toMatchObject({ paymentStatus: "PAID" });
    await expect(service.receive("store-centro", "sale-1", 300)).rejects.toThrow("Esta venda já foi recebida.");
    database.close();
    await database.open();
    expect(await repository.listEntries("store-centro")).toHaveLength(1);
    expect(await sales.get("sale-1")).toMatchObject({ paymentStatus: "PAID" });
  });

  it("settles partial payments using cents precision without exceeding the total", async () => {
    await database.open();
    await sales.save(sale({ total: 0.3 }));
    await service.open("store-centro", 0);
    await service.receive("store-centro", "sale-1", 0.1);
    expect(await sales.get("sale-1")).toMatchObject({ paymentStatus: "PENDING" });
    await service.receive("store-centro", "sale-1", 0.2);
    expect(await sales.get("sale-1")).toMatchObject({ paymentStatus: "PAID" });
    expect(await repository.listEntries("store-centro")).toHaveLength(2);
  });

  it("rejects a payment that would exceed the pending balance", async () => {
    await database.open();
    await sales.save(sale());
    await service.open("store-centro", 0);
    await service.receive("store-centro", "sale-1", 100);
    expect(await sales.get("sale-1")).toMatchObject({ paymentStatus: "PENDING" });
    await expect(service.receive("store-centro", "sale-1", 250)).rejects.toThrow("excede o saldo pendente");
    await service.receive("store-centro", "sale-1", 200);
    expect(await sales.get("sale-1")).toMatchObject({ paymentStatus: "PAID" });
    expect(await repository.listEntries("store-centro")).toHaveLength(2);
  });

  it("blocks receipts for other stores, unconfirmed sales and closed sessions", async () => {
    await database.open();
    await sales.save(sale());
    await sales.save(sale({ id: "sale-quote", status: "QUOTE" }));
    await sales.save(sale({ id: "sale-shopping", storeId: "store-shopping" }));
    await service.open("store-centro", 0);
    await expect(service.receive("store-centro", "sale-shopping", 10)).rejects.toThrow("Venda não encontrada nesta loja.");
    await expect(service.receive("store-centro", "sale-quote", 10)).rejects.toThrow("Somente vendas confirmadas");
    await expect(service.receive("store-shopping", "sale-shopping", 10)).rejects.toThrow("Abra o caixa antes de registrar recebimentos.");
    await expect(service.receive("store-centro", "missing", 10)).rejects.toThrow("Venda não encontrada nesta loja.");
    expect(await repository.listEntries("store-centro")).toHaveLength(0);
    expect(await repository.listEntries("store-shopping")).toHaveLength(0);
  });

  it("closes with conference, blocks new movements and allows reopening", async () => {
    await database.open();
    await sales.save(sale());
    await service.open("store-centro", 100);
    await service.receive("store-centro", "sale-1", 300);
    const closed = await service.close("store-centro", 415, "Operadora", "conferido");
    expect(closed).toMatchObject({ closingBalance: 415, expectedBalance: 400, difference: 15, closedBy: "Operadora", closingNote: "conferido" });
    expect(closed.closedAt).toBeTruthy();
    await expect(service.receive("store-centro", "sale-1", 1)).rejects.toThrow("Abra o caixa antes de registrar recebimentos.");
    await expect(service.close("store-centro", 400)).rejects.toThrow("Abra o caixa antes de fechar.");
    await expect(service.open("store-centro", 0)).resolves.toMatchObject({ storeId: "store-centro" });
    const sessions = await repository.listSessions("store-centro");
    expect(sessions).toHaveLength(2);
    expect(sessions.find((session) => session.closedAt)).toMatchObject({ expectedBalance: 400, difference: 15 });
    expect(await repository.listEntries("store-centro")).toHaveLength(1);
  });

  it("keeps sessions and movements isolated by store", async () => {
    await database.open();
    await sales.save(sale());
    await service.open("store-centro", 100);
    await service.receive("store-centro", "sale-1", 300);
    expect(await repository.listEntries("store-shopping")).toHaveLength(0);
    expect(await repository.current("store-shopping")).toBeUndefined();
    await expect(service.close("store-shopping", 0)).rejects.toThrow("Abra o caixa antes de fechar.");
    await expect(service.open("store-centro", 10)).rejects.toThrow("Já existe um caixa aberto nesta loja.");
    expect((await repository.listSessions("store-centro")).filter((session) => !session.closedAt)).toHaveLength(1);
  });
});
