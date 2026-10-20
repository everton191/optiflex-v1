import { describe, expect, it } from "vitest";
import type { AccessContext } from "./access-context";
import type { Customer } from "./customer";
import type { InventoryItem } from "./inventory";
import type { Sale } from "./sales";
import type { WorkOrder } from "./work-order";
import {
  GLOBAL_SEARCH_LIMIT,
  actionEntries,
  customerSearchEntries,
  globalSearchAllowed,
  globalSearchResults,
  globalSearchSeeds,
  navigationEntries,
  orderSearchEntries,
  productSearchEntries,
  saleSearchEntries
} from "./global-search";
import { routeGuards } from "../app/route-guards";

function context(role: AccessContext["role"], scope: AccessContext["scope"], storeIds: string[], currentStoreId = storeIds[0] ?? "store-a"): AccessContext {
  return { userName: "Teste", role, scope, storeIds, currentStoreId };
}

const seller = context("SELLER", "STORE", ["store-a"]);
const manager = context("STORE_MANAGER", "STORE", ["store-a"]);
const receptionist = context("RECEPTIONIST", "STORE", ["store-a"]);
const owner = context("OWNER", "NETWORK", ["store-a", "store-b"], "store-a");
const finance = context("FINANCE", "ORGANIZATION", ["store-a"], "store-a");

const customer: Customer = { id: "c1", name: "Maria da Silva", cpf: "111.444.777-35", phone: "11 99999-0000", createdAt: "2026-01-01T12:00:00" };
const product: InventoryItem = { id: "p1", storeId: "store-a", name: "Armação Titanio", code: "ARM-001", quantity: 3, minimumQuantity: 1 };
const otherStoreProduct: InventoryItem = { id: "p2", storeId: "store-b", name: "Lente Transitions", code: "LEN-002", quantity: 5, minimumQuantity: 1 };
const sale: Sale = { id: "s1", customerId: "c1", storeId: "store-a", status: "CONFIRMED", description: "Venda de armação + lente", total: 350, createdAt: "2026-01-02T12:00:00" };
const order: WorkOrder = { id: "o1", saleId: "s1", customerId: "c1", storeId: "store-a", status: "OPEN", createdAt: "2026-01-03T12:00:00" };
const names = new Map([["c1", "Maria da Silva"]]);

describe("índice de permissões da paleta", () => {
  it("keeps the menu and the palette as one source of truth aligned with route guards", () => {
    const guardByPath = new Map(routeGuards.filter((guard) => guard.path).map((guard) => [guard.path, guard.permission]));
    for (const entry of globalSearchSeeds) {
      if (entry.to === "/") continue;
      const path = entry.to.replace(/^\//, "");
      expect(guardByPath.get(path), `permissão divergente para ${entry.to}`).toBe(entry.permission);
    }
    const indexGuard = routeGuards.find((guard) => guard.index);
    expect(navigationEntries.find((entry) => entry.to === "/")?.permission).toBe(indexGuard?.permission);
  });

  it("does not leak clinical data: only the clinical page is gated, records are never seeded", () => {
    const kinds = new Set(globalSearchSeeds.map((entry) => entry.kind));
    expect([...kinds].sort()).toEqual(["action", "page"]);
    expect(seller.role).toBe("SELLER");
    const clinicalPage = navigationEntries.find((entry) => entry.to === "/clinico");
    expect(clinicalPage && globalSearchAllowed(clinicalPage, seller)).toBe(false);
    expect(clinicalPage && globalSearchAllowed(clinicalPage, receptionist)).toBe(false);
  });
});

describe("seletor de resultados por perfil", () => {
  it("hides management pages and actions from a seller", () => {
    const labels = globalSearchResults("", globalSearchSeeds, seller).map((entry) => entry.label);
    expect(labels).toContain("Visão geral");
    expect(labels).toContain("Clientes");
    expect(labels).toContain("Caixa");
    expect(labels).not.toContain("Estoque");
    expect(labels).not.toContain("Usuários");
    expect(labels).not.toContain("Configurações");
    expect(labels).not.toContain("Novo cliente");
    expect(labels).not.toContain("Novo atendimento");
  });

  it("does not return management targets for a seller even by explicit query", () => {
    expect(globalSearchResults("configurações", globalSearchSeeds, seller)).toEqual([]);
    expect(globalSearchResults("novo cliente", globalSearchSeeds, seller)).toEqual([]);
    expect(globalSearchResults("usuários", globalSearchSeeds, seller)).toEqual([]);
  });

  it("returns allowed actions for receptionist and hides admin pages", () => {
    const results = globalSearchResults("novo", globalSearchSeeds, receptionist).map((entry) => entry.label);
    expect(results).toContain("Novo cliente");
    expect(results).toContain("Novo atendimento");
    expect(globalSearchResults("lojas", globalSearchSeeds, receptionist)).toEqual([]);
  });
});

describe("isolamento de loja", () => {
  it("hides records from stores outside the user scope", () => {
    const entries = [...productSearchEntries([product, otherStoreProduct])];
    const labels = globalSearchResults("lente", entries, manager).map((entry) => entry.label);
    expect(labels).toEqual([]);
    const own = globalSearchResults("armação", entries, manager).map((entry) => entry.label);
    expect(own).toEqual(["Armação Titanio"]);
  });

  it("lets network scope see every store and organization scope see its records", () => {
    expect(globalSearchResults("lente", productSearchEntries([product, otherStoreProduct]), owner).map((entry) => entry.label)).toEqual(["Lente Transitions"]);
    const foreignSale: Sale = { ...sale, id: "s2", storeId: "store-b", description: "Venda da filial B" };
    const salesEntries = saleSearchEntries([sale, foreignSale], names);
    expect(globalSearchResults("filial", salesEntries, finance).map((entry) => entry.id)).toEqual(["sale:s2"]);
  });

  it("keeps store scoping on sales and orders", () => {
    const foreignSale: Sale = { ...sale, id: "s2", storeId: "store-b", description: "Venda da filial B" };
    const entries = saleSearchEntries([sale, foreignSale], names);
    expect(globalSearchResults("venda", entries, manager).map((entry) => entry.id)).toEqual(["sale:s1"]);
    expect(globalSearchResults("venda", entries, owner).map((entry) => entry.id).sort()).toEqual(["sale:s1", "sale:s2"]);
  });
});

describe("busca e ordenação", () => {
  it("matches labels, details and keywords without accents or punctuation", () => {
    const entries = [...customerSearchEntries([customer]), ...productSearchEntries([product])];
    expect(globalSearchResults("maria", entries, manager).map((entry) => entry.id)).toEqual(["customer:c1"]);
    expect(globalSearchResults("11144477735", entries, manager).map((entry) => entry.id)).toEqual(["customer:c1"]);
    expect(globalSearchResults("ARM 001", entries, manager).map((entry) => entry.id)).toEqual(["product:p1"]);
  });

  it("shows pages and actions first, then records", () => {
    const entries = [...globalSearchSeeds, ...customerSearchEntries([{ ...customer, name: "Clientes e Filhos" }])];
    const results = globalSearchResults("clientes", entries, receptionist);
    expect(results[0]?.kind).toBe("page");
    expect(results.some((entry) => entry.kind === "customer")).toBe(true);
  });

  it("returns only pages and actions while the query is empty", () => {
    const entries = [...globalSearchSeeds, ...customerSearchEntries([customer])];
    const results = globalSearchResults("", entries, manager);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((entry) => entry.kind === "page" || entry.kind === "action")).toBe(true);
  });

  it("caps the list and orders sales and orders by kind", () => {
    const many = Array.from({ length: 15 }, (_, index) => ({ ...customer, id: `c${index}`, name: `Cliente ${index}` }));
    expect(customerSearchEntries(many)).toHaveLength(15);
    expect(globalSearchResults("cliente", customerSearchEntries(many), manager)).toHaveLength(GLOBAL_SEARCH_LIMIT);
    const mixed = [...orderSearchEntries([order], names), ...saleSearchEntries([sale], names)];
    const results = globalSearchResults("maria", mixed, manager).map((entry) => entry.kind);
    expect(results).toEqual(["sale", "order"]);
  });

  it("never returns entries without the required permission", () => {
    for (const entry of globalSearchSeeds) {
      expect(globalSearchAllowed(entry, seller)).toBe(["dashboard.view", "customers.read", "cash.read", "sales.read"].includes(entry.permission));
    }
    expect(actionEntries.every((entry) => !globalSearchAllowed(entry, seller))).toBe(true);
  });
});
