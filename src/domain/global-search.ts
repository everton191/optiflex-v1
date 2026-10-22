// Busca global do painel (F7-10 — issue #125): índice em memória + seletor de
// resultados. P0 de permissão: nada aparece sem a permissão da rota/ação e
// registros carregam o filtro de loja do AccessContext (canAccessRecord).
// Fora de escopo por decisão do card: dado clínico (prescrições/anexos) não é
// indexado — a página Área clínica continua protegida por rota.

import { hasPermission, type Permission } from "./access";
import { canAccessRecord, type AccessContext } from "./access-context";
import type { Customer } from "./customer";
import { normalizeSearchText } from "./customer";
import type { InventoryItem } from "./inventory";
import type { Sale } from "./sales";
import type { WorkOrder } from "./work-order";
import { workOrderStatusLabels } from "./work-order";

export type GlobalSearchKind = "page" | "action" | "customer" | "product" | "sale" | "order";

export interface GlobalSearchEntry {
  id: string;
  kind: GlobalSearchKind;
  label: string;
  detail?: string;
  keywords?: string;
  to: string;
  permission: Permission;
  storeId?: string;
}

export interface NavigationEntry extends GlobalSearchEntry {
  kind: "page";
  shortLabel: string;
  section: "main" | "admin";
}

// Única fonte dos menus: AppShell renderiza estas entradas e a busca global as
// reutiliza — paleta e menu não podem divergir de permissão.
export const navigationEntries: readonly NavigationEntry[] = [
  { id: "nav.dashboard", kind: "page", label: "Visão geral", shortLabel: "Início", to: "/", permission: "dashboard.view", section: "main" },
  { id: "nav.customers", kind: "page", label: "Clientes", shortLabel: "Clientes", to: "/clientes", permission: "customers.read", section: "main" },
  { id: "nav.agenda", kind: "page", label: "Agenda", shortLabel: "Agenda", to: "/agenda", permission: "attendance.read", section: "main" },
  { id: "nav.attendance", kind: "page", label: "Atendimentos", shortLabel: "Fila", to: "/atendimentos", permission: "attendance.read", section: "main" },
  { id: "nav.clinical", kind: "page", label: "Área clínica", shortLabel: "Clínico", to: "/clinico", permission: "clinical.workspace.access", section: "main" },
  { id: "nav.cash", kind: "page", label: "Caixa", shortLabel: "Caixa", to: "/caixa", permission: "cash.read", section: "main" },
  { id: "nav.orders", kind: "page", label: "Ordens de serviço", shortLabel: "OS", to: "/ordens-servico", permission: "sales.read", section: "main" },
  { id: "nav.inventory", kind: "page", label: "Estoque", shortLabel: "Estoque", to: "/estoque", permission: "inventory.read", section: "main" },
  { id: "nav.stores", kind: "page", label: "Lojas", shortLabel: "Lojas", to: "/admin/lojas", permission: "stores.manage", section: "admin" },
  { id: "nav.suppliers", kind: "page", label: "Fornecedores", shortLabel: "Fornecedores", to: "/admin/fornecedores", permission: "settings.manage", section: "admin" },
  { id: "nav.users", kind: "page", label: "Usuários", shortLabel: "Usuários", to: "/admin/usuarios", permission: "users.read", section: "admin" },
  { id: "nav.profiles", kind: "page", label: "Perfis de acesso", shortLabel: "Perfis", to: "/admin/perfis", permission: "roles.read", section: "admin" },
  { id: "nav.audit", kind: "page", label: "Auditoria", shortLabel: "Auditoria", to: "/admin/auditoria", permission: "settings.manage", section: "admin" },
  { id: "nav.settings", kind: "page", label: "Configurações", shortLabel: "Ajustes", to: "/admin/configuracoes", permission: "settings.manage", section: "admin" },
  { id: "nav.assistant", kind: "page", label: "Assistente inicial", shortLabel: "Assistente", to: "/admin/assistente", permission: "settings.manage", section: "admin" }
];

export const actionEntries: readonly GlobalSearchEntry[] = [
  { id: "action.new-customer", kind: "action", label: "Novo cliente", to: "/clientes/novo", permission: "customers.manage" },
  { id: "action.new-attendance", kind: "action", label: "Novo atendimento", to: "/atendimentos/novo", permission: "attendance.create" }
];

export const globalSearchSeeds: readonly GlobalSearchEntry[] = [...navigationEntries, ...actionEntries];

export function customerSearchEntries(customers: readonly Customer[]): GlobalSearchEntry[] {
  return customers.map((customer) => ({
    id: `customer:${customer.id}`,
    kind: "customer" as const,
    label: customer.name,
    detail: customer.cpf || customer.phone || undefined,
    keywords: [customer.cpf, customer.phone, customer.email].filter(Boolean).join(" "),
    to: `/clientes/${customer.id}`,
    permission: "customers.read" as Permission
  }));
}

export function productSearchEntries(products: readonly InventoryItem[]): GlobalSearchEntry[] {
  return products.map((product) => ({
    id: `product:${product.id}`,
    kind: "product" as const,
    label: product.name,
    detail: product.code ? `Código ${product.code}` : undefined,
    keywords: [product.code, product.brand, product.material, product.description].filter(Boolean).join(" "),
    to: "/estoque",
    permission: "inventory.read" as Permission,
    storeId: product.storeId
  }));
}

export function saleSearchEntries(sales: readonly Sale[], customerNames: ReadonlyMap<string, string> = new Map()): GlobalSearchEntry[] {
  return sales.map((sale) => ({
    id: `sale:${sale.id}`,
    kind: "sale" as const,
    label: sale.description,
    detail: `${customerNames.get(sale.customerId) ?? "Cliente"} · R$ ${sale.total.toFixed(2)}`,
    keywords: customerNames.get(sale.customerId),
    to: `/vendas/${sale.id}`,
    permission: "sales.read" as Permission,
    storeId: sale.storeId
  }));
}

export function orderSearchEntries(orders: readonly WorkOrder[], customerNames: ReadonlyMap<string, string> = new Map()): GlobalSearchEntry[] {
  return orders.map((order) => ({
    id: `order:${order.id}`,
    kind: "order" as const,
    label: customerNames.get(order.customerId) ?? "Ordem de serviço",
    detail: workOrderStatusLabels[order.status],
    keywords: [customerNames.get(order.customerId), order.laboratory].filter(Boolean).join(" "),
    to: `/ordens-servico/${order.id}`,
    permission: "sales.read" as Permission,
    storeId: order.storeId
  }));
}

export const GLOBAL_SEARCH_LIMIT = 10;

const kindRank: Record<GlobalSearchKind, number> = { page: 0, action: 1, customer: 2, product: 3, sale: 4, order: 5 };

function compact(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

export function globalSearchAllowed(entry: GlobalSearchEntry, context: AccessContext): boolean {
  if (!hasPermission(context.role, entry.permission)) return false;
  if (entry.storeId !== undefined && !canAccessRecord(context, { storeId: entry.storeId })) return false;
  return true;
}

export function globalSearchResults(query: string, entries: readonly GlobalSearchEntry[], context: AccessContext): GlobalSearchEntry[] {
  const needle = compact(query);
  const allowed = entries.filter((entry) => globalSearchAllowed(entry, context));
  const candidates = needle
    ? allowed.filter((entry) => compact(`${entry.label} ${entry.detail ?? ""} ${entry.keywords ?? ""}`).includes(needle))
    : allowed.filter((entry) => entry.kind === "page" || entry.kind === "action");
  return candidates
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const prefix = needle ? Number(!compact(left.entry.label).startsWith(needle)) - Number(!compact(right.entry.label).startsWith(needle)) : 0;
      return kindRank[left.entry.kind] - kindRank[right.entry.kind] || prefix || left.index - right.index;
    })
    .slice(0, GLOBAL_SEARCH_LIMIT)
    .map(({ entry }) => entry);
}
