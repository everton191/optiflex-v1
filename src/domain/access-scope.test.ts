import { afterEach, describe, expect, it } from "vitest";
import { assertRecordAccess, assertStoreAccess, buildAccessContext, canAccessRecord, canAccessStore, setAccessContext } from "./access-context";
import { roleDefinitions, type LocalSession, type RoleKey, type User } from "./access";

const users: User[] = [
  { id: "user-owner", name: "Ana Owner", email: "owner@opticore.local", role: "OWNER", scope: "NETWORK", storeIds: ["store-centro"], active: true },
  { id: "user-seller", name: "Bia Seller", email: "seller@opticore.local", role: "SELLER", scope: "STORE", storeIds: ["store-centro"], active: true },
  { id: "user-fin", name: "Fio Fin", email: "fin@opticore.local", role: "FINANCE", scope: "ORGANIZATION", storeIds: [], active: true }
];
function session(role: RoleKey, userName: string): LocalSession { return { id: "current", userName, role }; }

afterEach(() => setAccessContext(null));

describe("buildAccessContext", () => {
  it("derives scope from the role and allowed stores from the user record", () => {
    expect(buildAccessContext(session("SELLER", "Bia Seller"), users, "store-centro")).toEqual({ userName: "Bia Seller", role: "SELLER", scope: "STORE", storeIds: ["store-centro"], currentStoreId: "store-centro" });
    expect(buildAccessContext(session("FINANCE", "Fio Fin"), users, "store-centro").scope).toBe("ORGANIZATION");
    expect(buildAccessContext(session("SELLER", "Ghost"), users, "store-centro").storeIds).toEqual([]);
  });
});

describe("store access by profile", () => {
  it("limits store-bound roles to their own stores", () => {
    const seller = buildAccessContext(session("SELLER", "Bia Seller"), users, "store-centro");
    expect(canAccessStore(seller, "store-centro")).toBe(true);
    expect(canAccessStore(seller, "store-shopping")).toBe(false);
    expect(canAccessStore(seller, "store-outra")).toBe(false);
  });

  it("lets NETWORK and ORGANIZATION profiles reach every store", () => {
    expect(canAccessStore(buildAccessContext(session("OWNER", "Ana Owner"), users, "store-centro"), "store-shopping")).toBe(true);
    expect(canAccessStore(buildAccessContext(session("FINANCE", "Fio Fin"), users, "store-centro"), "store-shopping")).toBe(true);
  });

  it("denies every store for a store-bound user without a user record", () => {
    const ghost = buildAccessContext(session("SELLER", "Ghost"), users, "store-centro");
    expect(canAccessStore(ghost, "store-centro")).toBe(false);
  });
});

describe("record access", () => {
  it("filters other-store records for store-bound profiles and keeps shared records", () => {
    const seller = buildAccessContext(session("SELLER", "Bia Seller"), users, "store-centro");
    expect(canAccessRecord(seller, { storeId: "store-centro" })).toBe(true);
    expect(canAccessRecord(seller, { storeId: "store-shopping" })).toBe(false);
    expect(canAccessRecord(seller, {})).toBe(true);
  });

  it("keeps global profiles on any record and SELF on own records only", () => {
    const owner = buildAccessContext(session("OWNER", "Ana Owner"), users, "store-centro");
    expect(canAccessRecord(owner, { storeId: "store-shopping" })).toBe(true);
    const self = { userName: "Bia", role: "SELLER" as RoleKey, scope: "SELF" as const, storeIds: ["store-centro"], currentStoreId: "store-centro" };
    expect(canAccessRecord(self, { userId: "Bia" })).toBe(true);
    expect(canAccessRecord(self, { userId: "Ana" })).toBe(false);
    expect(canAccessRecord(self, { storeId: "store-centro" })).toBe(false);
  });
});

describe("role scope matrix", () => {
  it("maps every role to the scope declared in roleDefinitions", () => {
    const expected: Record<RoleKey, string> = {
      OWNER: "NETWORK", NETWORK_ADMINISTRATOR: "NETWORK", AUDITOR: "NETWORK",
      FINANCE: "ORGANIZATION",
      STORE_MANAGER: "STORE", RECEPTIONIST: "STORE", CLINICAL_PROFESSIONAL: "STORE", SELLER: "STORE", CASHIER: "STORE", STOCK_MANAGER: "STORE"
    };
    for (const definition of roleDefinitions) expect({ [definition.key]: definition.scope }).toEqual({ [definition.key]: expected[definition.key] });
    expect(roleDefinitions).toHaveLength(10);
  });
});

describe("active context guards", () => {
  it("throws only when an active context exists and denies the target", () => {
    setAccessContext(buildAccessContext(session("SELLER", "Bia Seller"), users, "store-centro"));
    expect(() => assertStoreAccess("store-centro")).not.toThrow();
    expect(() => assertStoreAccess("store-shopping")).toThrow("Acesso negado: você não tem acesso a esta loja.");
    expect(() => assertRecordAccess({ storeId: "store-shopping" })).toThrow("Acesso negado: este registro pertence a outra loja ou usuário.");
    expect(() => assertRecordAccess({ storeId: "store-centro" })).not.toThrow();
    setAccessContext(buildAccessContext(session("OWNER", "Ana Owner"), users, "store-centro"));
    expect(() => assertStoreAccess("store-shopping")).not.toThrow();
    setAccessContext(null);
    expect(() => assertStoreAccess("store-shopping")).not.toThrow();
    expect(() => assertRecordAccess({ storeId: "store-shopping" })).not.toThrow();
  });
});
