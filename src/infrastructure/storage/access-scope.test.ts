import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setAccessContext, type AccessContext } from "../../domain/access-context";
import type { Attendance } from "../../domain/customer";
import type { Sale } from "../../domain/sales";
import { database } from "./database";
import { LocalAttendanceRepository, LocalSaleRepository } from "./local-repositories";

const attendances = new LocalAttendanceRepository();
const sales = new LocalSaleRepository();
const seller: AccessContext = { userName: "Bia Seller", role: "SELLER", scope: "STORE", storeIds: ["store-centro"], currentStoreId: "store-centro" };
const owner: AccessContext = { userName: "Ana Owner", role: "OWNER", scope: "NETWORK", storeIds: [], currentStoreId: "store-shopping" };
function attendance(id: string, storeId: string): Attendance { return { id, customerId: "customer-1", storeId, type: "CONSULTATION", status: "WAITING", createdAt: "2026-10-08T10:00:00.000Z" }; }
function sale(id: string, storeId: string): Sale { return { id, customerId: "customer-1", storeId, status: "QUOTE", description: "Armação", total: 120, createdAt: "2026-10-08T10:00:00.000Z" }; }

beforeEach(async () => { await database.open(); setAccessContext(seller); });
afterEach(async () => { setAccessContext(null); await database.delete(); });

describe("repository enforcement with an active access context", () => {
  it("blocks writes and store listings outside the profile's stores", async () => {
    await expect(attendances.save(attendance("att-shopping", "store-shopping"))).rejects.toThrow("Acesso negado");
    await expect(sales.save(sale("sale-shopping", "store-shopping"))).rejects.toThrow("Acesso negado");
    await expect(attendances.listByStore("store-shopping")).rejects.toThrow("Acesso negado");
    await expect(sales.listByStore("store-shopping")).rejects.toThrow("Acesso negado");
    await expect(attendances.save(attendance("att-centro", "store-centro"))).resolves.toBeUndefined();
    await expect(attendances.listByStore("store-centro")).resolves.toHaveLength(1);
  });

  it("filters the customer history to accessible stores", async () => {
    await database.attendances.bulkAdd([attendance("att-centro", "store-centro"), attendance("att-shopping", "store-shopping")]);
    const rows = await attendances.listByCustomer("customer-1");
    expect(rows.map((row) => row.id)).toEqual(["att-centro"]);
  });

  it("lets a NETWORK profile read and write any store", async () => {
    setAccessContext(owner);
    await expect(attendances.listByStore("store-centro")).resolves.toEqual([]);
    await expect(sales.save(sale("sale-any", "store-centro"))).resolves.toBeUndefined();
  });

  it("keeps enforcement off when no session context is active", async () => {
    setAccessContext(null);
    await expect(attendances.save(attendance("att-free", "store-shopping"))).resolves.toBeUndefined();
    await expect(attendances.listByStore("store-shopping")).resolves.toHaveLength(1);
  });
});
