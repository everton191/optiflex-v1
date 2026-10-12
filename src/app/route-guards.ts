import type { Permission } from "../domain/access";

export interface RouteGuard {
  index?: boolean;
  path?: string;
  permission: Permission;
}

// Single source of truth for guarded routes: the router renders these entries and tests assert the matrix.
export const routeGuards: readonly RouteGuard[] = [
  { index: true, permission: "dashboard.view" },
  { path: "clientes", permission: "customers.read" },
  { path: "clientes/novo", permission: "customers.manage" },
  { path: "clientes/:customerId", permission: "customers.read" },
  { path: "clientes/:customerId/editar", permission: "customers.manage" },
  { path: "atendimentos", permission: "attendance.read" },
  { path: "agenda", permission: "attendance.read" },
  { path: "clinico", permission: "clinical.workspace.access" },
  { path: "clinico/atendimento/:attendanceId", permission: "clinical.workspace.access" },
  { path: "caixa", permission: "cash.read" },
  { path: "estoque", permission: "inventory.read" },
  { path: "ordens-servico", permission: "sales.read" },
  { path: "ordens-servico/:orderId", permission: "sales.read" },
  { path: "admin/usuarios", permission: "users.read" },
  { path: "admin/perfis", permission: "roles.read" },
  { path: "admin/configuracoes", permission: "settings.manage" }
];
