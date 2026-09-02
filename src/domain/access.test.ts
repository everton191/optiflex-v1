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
