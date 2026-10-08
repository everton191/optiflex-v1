import { describe, expect, it } from "vitest";
import { hasPermission } from "./access";

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
