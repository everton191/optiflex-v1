import { describe, expect, it } from "vitest";
import { allPermissions, hasPermission, roleDefinitions, type Permission, type RoleKey } from "./access";
import { buildAccessContext, canAccessRecord, canAccessStore } from "./access-context";
import { routeGuards } from "../app/route-guards";
import type { User } from "./access";

// Expected permission set per role: the guard matrix asserted against routeGuards and actions.
const expectedRoutePermissions: Record<RoleKey, readonly Permission[]> = {
  OWNER: ["dashboard.view", "customers.read", "customers.manage", "attendance.read", "attendance.create", "clinical.workspace.access", "cash.read", "inventory.read", "sales.read", "stores.manage", "users.read", "roles.read", "settings.manage"],
  NETWORK_ADMINISTRATOR: ["dashboard.view", "customers.read", "customers.manage", "attendance.read", "attendance.create", "cash.read", "inventory.read", "sales.read", "stores.manage", "users.read", "roles.read", "settings.manage"],
  STORE_MANAGER: ["dashboard.view", "customers.read", "customers.manage", "attendance.read", "attendance.create", "cash.read", "inventory.read", "sales.read", "users.read"],
  RECEPTIONIST: ["dashboard.view", "customers.read", "customers.manage", "attendance.read", "attendance.create"],
  CLINICAL_PROFESSIONAL: ["dashboard.view", "customers.read", "attendance.read", "clinical.workspace.access"],
  SELLER: ["dashboard.view", "customers.read", "cash.read", "sales.read"],
  CASHIER: ["dashboard.view", "cash.read", "sales.read"],
  STOCK_MANAGER: ["dashboard.view", "inventory.read"],
  FINANCE: ["dashboard.view", "cash.read", "sales.read"],
  AUDITOR: ["dashboard.view", "cash.read", "sales.read", "inventory.read"]
};

describe("route guard matrix for all ten profiles", () => {
  it("exposes exactly one known permission per guarded route", () => {
    expect(routeGuards).toHaveLength(19);
    for (const guard of routeGuards) expect(allPermissions).toContain(guard.permission);
    const indexGuards = routeGuards.filter((guard) => guard.index);
    expect(indexGuards).toHaveLength(1);
    expect(indexGuards[0].permission).toBe("dashboard.view");
  });
  it("allows or denies every guarded route exactly as the role matrix declares", () => {
    for (const definition of roleDefinitions) {
      const allowed = expectedRoutePermissions[definition.key];
      for (const guard of routeGuards) {
        expect({ role: definition.key, path: guard.index ? "/" : guard.path, allowed: hasPermission(definition.key, guard.permission) })
          .toEqual({ role: definition.key, path: guard.index ? "/" : guard.path, allowed: allowed.includes(guard.permission) });
      }
    }
  });
});

describe("action negatives for seller, clinical and cashier", () => {
  it("keeps the seller on quotes without cash management, stock or clinical", () => {
    expect(hasPermission("SELLER", "sales.manage")).toBe(true);
    expect(hasPermission("SELLER", "cash.manage")).toBe(false);
    expect(hasPermission("SELLER", "inventory.manage")).toBe(false);
    expect(hasPermission("SELLER", "attendance.create")).toBe(false);
    expect(hasPermission("SELLER", "clinical.workspace.access")).toBe(false);
  });
  it("keeps the clinical profile on the chart without sales, cash or customer management", () => {
    expect(hasPermission("CLINICAL_PROFESSIONAL", "clinical.workspace.access")).toBe(true);
    expect(hasPermission("CLINICAL_PROFESSIONAL", "attendance.create")).toBe(false);
    expect(hasPermission("CLINICAL_PROFESSIONAL", "sales.manage")).toBe(false);
    expect(hasPermission("CLINICAL_PROFESSIONAL", "cash.read")).toBe(false);
    expect(hasPermission("CLINICAL_PROFESSIONAL", "customers.manage")).toBe(false);
  });
  it("keeps the cashier on register operations without sales authoring or clinical", () => {
    expect(hasPermission("CASHIER", "cash.manage")).toBe(true);
    expect(hasPermission("CASHIER", "sales.manage")).toBe(false);
    expect(hasPermission("CASHIER", "customers.manage")).toBe(false);
    expect(hasPermission("CASHIER", "attendance.create")).toBe(false);
    expect(hasPermission("CASHIER", "clinical.workspace.access")).toBe(false);
  });
});

describe("record and store scope for all ten profiles", () => {
  const users: User[] = roleDefinitions.map((definition, index) => ({
    id: `user-${index}`,
    name: `Person ${definition.key}`,
    email: `${definition.key.toLowerCase()}@opticore.local`,
    role: definition.key,
    scope: definition.scope,
    storeIds: definition.scope === "STORE" ? ["store-centro"] : [],
    active: true
  }));
  const globalRoles: RoleKey[] = ["OWNER", "NETWORK_ADMINISTRATOR", "FINANCE", "AUDITOR"];
  const storeRoles: RoleKey[] = ["STORE_MANAGER", "RECEPTIONIST", "CLINICAL_PROFESSIONAL", "SELLER", "CASHIER", "STOCK_MANAGER"];

  it("gives NETWORK and ORGANIZATION profiles every store and record", () => {
    for (const role of globalRoles) {
      const context = buildAccessContext({ id: "current", userName: `Person ${role}`, role }, users, "store-centro");
      expect({ role, store: canAccessStore(context, "store-shopping") }).toEqual({ role, store: true });
      expect({ role, record: canAccessRecord(context, { storeId: "store-shopping" }) }).toEqual({ role, record: true });
    }
  });
  it("limits STORE profiles to their own stores and records", () => {
    for (const role of storeRoles) {
      const context = buildAccessContext({ id: "current", userName: `Person ${role}`, role }, users, "store-centro");
      expect({ role, own: canAccessStore(context, "store-centro"), other: canAccessStore(context, "store-shopping") }).toEqual({ role, own: true, other: false });
      expect({ role, own: canAccessRecord(context, { storeId: "store-centro" }), other: canAccessRecord(context, { storeId: "store-shopping" }) }).toEqual({ role, own: true, other: false });
    }
  });
});
