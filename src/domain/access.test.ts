import { describe, expect, it } from "vitest";
import { isSessionExpired, hasPermission, sessionUserState } from "./access";
import type { User } from "./access";

describe("clinical professional permission model", () => {
  it("grants clinical workspace access without relying on a profession label", () => {
    expect(hasPermission("CLINICAL_PROFESSIONAL", "clinical.workspace.access")).toBe(true);
    expect(hasPermission("CLINICAL_PROFESSIONAL", "settings.manage")).toBe(false);
  });
});

describe("role-based navigation permissions", () => {
  it("keeps reception focused on customers and attendance", () => {
    expect(hasPermission("RECEPTIONIST", "customers.manage")).toBe(true);
    expect(hasPermission("RECEPTIONIST", "attendance.read")).toBe(true);
    expect(hasPermission("RECEPTIONIST", "cash.read")).toBe(false);
  });

  it("gives sales and cashier only the cash tools they use", () => {
    expect(hasPermission("SELLER", "sales.manage")).toBe(true);
    expect(hasPermission("SELLER", "cash.manage")).toBe(false);
    expect(hasPermission("CASHIER", "sales.manage")).toBe(false);
    expect(hasPermission("CASHIER", "cash.manage")).toBe(true);
  });

  it("keeps inventory isolated for stock users", () => {
    expect(hasPermission("STOCK_MANAGER", "inventory.manage")).toBe(true);
    expect(hasPermission("STOCK_MANAGER", "cash.read")).toBe(false);
  });
});

describe("cash permission matrix", () => {
  it("allows cashiers to open, receive and close the register", () => {
    expect(hasPermission("CASHIER", "cash.read")).toBe(true);
    expect(hasPermission("CASHIER", "cash.manage")).toBe(true);
    expect(hasPermission("CASHIER", "sales.manage")).toBe(false);
  });

  it("gives finance and auditors read-only access to the register", () => {
    expect(hasPermission("FINANCE", "cash.read")).toBe(true);
    expect(hasPermission("FINANCE", "cash.manage")).toBe(false);
    expect(hasPermission("AUDITOR", "cash.read")).toBe(true);
    expect(hasPermission("AUDITOR", "cash.manage")).toBe(false);
  });

  it("keeps clinical and reception profiles away from the register", () => {
    expect(hasPermission("CLINICAL_PROFESSIONAL", "cash.read")).toBe(false);
    expect(hasPermission("CLINICAL_PROFESSIONAL", "cash.manage")).toBe(false);
    expect(hasPermission("RECEPTIONIST", "cash.read")).toBe(false);
    expect(hasPermission("RECEPTIONIST", "cash.manage")).toBe(false);
  });

  it("keeps sellers on sales without cash management", () => {
    expect(hasPermission("SELLER", "sales.read")).toBe(true);
    expect(hasPermission("SELLER", "cash.read")).toBe(true);
    expect(hasPermission("SELLER", "cash.manage")).toBe(false);
    expect(hasPermission("OWNER", "cash.manage")).toBe(true);
    expect(hasPermission("STORE_MANAGER", "cash.manage")).toBe(true);
  });
});

describe("inactive users do not enter", () => {
  const users: User[] = [
    { id: "user-1", name: "Ana", email: "ana@opticore.local", role: "SELLER", scope: "STORE", storeIds: ["store-centro"], active: false },
    { id: "user-2", name: "Beto", email: "beto@opticore.local", role: "CASHIER", scope: "STORE", storeIds: ["store-centro"], active: true }
  ];

  it("blocks the session when its user is inactive", () => {
    expect(sessionUserState(users, { id: "current", userName: "Ana", role: "SELLER" })).toBe("inactive");
  });

  it("allows active or unidentified sessions", () => {
    expect(sessionUserState(users, { id: "current", userName: "Beto", role: "CASHIER" })).toBe("active");
    expect(sessionUserState(users, { id: "current", userName: "Zeca", role: "RECEPTIONIST" })).toBe("unknown");
  });
});

describe("session expiry guard", () => {
  const now = new Date("2026-10-08T12:00:00.000Z");
  const session = { id: "current" as const, userName: "Ana", role: "SELLER" as const };

  it("expires sessions without issue date or with an invalid date", () => {
    expect(isSessionExpired(session, now)).toBe(true);
    expect(isSessionExpired({ ...session, issuedAt: "data-invalida" }, now)).toBe(true);
  });

  it("keeps sessions inside the TTL and expires older ones", () => {
    expect(isSessionExpired({ ...session, issuedAt: "2026-10-08T01:00:00.000Z" }, now)).toBe(false);
    expect(isSessionExpired({ ...session, issuedAt: "2026-10-07T23:59:59.000Z" }, now)).toBe(true);
  });
});
