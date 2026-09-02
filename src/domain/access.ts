export type Scope = "SELF" | "STORE" | "ORGANIZATION" | "NETWORK";

export type RoleKey =
  | "OWNER"
  | "NETWORK_ADMINISTRATOR"
  | "STORE_MANAGER"
  | "RECEPTIONIST"
  | "CLINICAL_PROFESSIONAL"
  | "SELLER"
  | "CASHIER"
  | "STOCK_MANAGER"
  | "FINANCE"
  | "AUDITOR";

export type Permission =
  | "dashboard.view"
  | "stores.read"
  | "stores.manage"
  | "stores.select"
  | "users.read"
  | "settings.manage"
  | "users.manage"
  | "roles.read"
  | "roles.manage"
  | "customers.read"
  | "customers.manage"
  | "attendance.read"
  | "attendance.create"
  | "attendance.queue.read"
  | "clinical.workspace.access"
  | "sales.read"
  | "sales.manage"
  | "cash.read"
  | "cash.manage"
  | "inventory.read"
  | "inventory.manage";

export interface OrganizationSettings {
  id: "current";
  organizationName: string;
  clinicalProfessionalLabel: string;
}

export interface LocalSession {
  id: "current";
  userName: string;
  role: RoleKey;
}

export interface Store {
  id: string;
  name: string;
  active: boolean;
}

export interface CurrentStoreContext {
  id: "current";
  storeId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  scope: Scope;
  storeIds: string[];
  active: boolean;
}

export interface RoleDefinition {
  key: RoleKey;
  label: string;
  scope: Scope;
  permissions: readonly Permission[];
}

export const rolePermissions: Readonly<Record<RoleKey, readonly Permission[]>> = {
  OWNER: ["dashboard.view", "stores.read", "stores.manage", "stores.select", "users.read", "users.manage", "settings.manage", "roles.read", "roles.manage", "customers.read", "customers.manage", "attendance.read", "attendance.create", "attendance.queue.read", "clinical.workspace.access", "sales.read", "sales.manage", "cash.read", "cash.manage", "inventory.read", "inventory.manage"],
  NETWORK_ADMINISTRATOR: ["dashboard.view", "stores.read", "stores.manage", "stores.select", "users.read", "users.manage", "settings.manage", "roles.read", "roles.manage", "customers.read", "customers.manage", "attendance.read", "attendance.create", "attendance.queue.read", "sales.read", "sales.manage", "cash.read", "cash.manage", "inventory.read", "inventory.manage"],
  STORE_MANAGER: ["dashboard.view", "stores.read", "stores.select", "users.read", "customers.read", "customers.manage", "attendance.read", "attendance.create", "attendance.queue.read", "sales.read", "sales.manage", "cash.read", "cash.manage", "inventory.read", "inventory.manage"],
  RECEPTIONIST: ["dashboard.view", "stores.read", "stores.select", "customers.read", "customers.manage", "attendance.read", "attendance.create", "attendance.queue.read"],
  CLINICAL_PROFESSIONAL: ["dashboard.view", "stores.read", "stores.select", "customers.read", "attendance.read", "attendance.queue.read", "clinical.workspace.access"],
  SELLER: ["dashboard.view", "stores.read", "stores.select", "customers.read", "sales.read", "sales.manage", "cash.read"],
  CASHIER: ["dashboard.view", "stores.read", "stores.select", "sales.read", "cash.read", "cash.manage"],
  STOCK_MANAGER: ["dashboard.view", "stores.read", "stores.select", "inventory.read", "inventory.manage"],
  FINANCE: ["dashboard.view", "stores.read", "stores.select", "sales.read", "cash.read"],
  AUDITOR: ["dashboard.view", "stores.read", "sales.read", "cash.read", "inventory.read"]
};

export const roleDefinitions: readonly RoleDefinition[] = [
  { key: "OWNER", label: "Proprietário", scope: "NETWORK", permissions: rolePermissions.OWNER },
  { key: "NETWORK_ADMINISTRATOR", label: "Administrador geral", scope: "NETWORK", permissions: rolePermissions.NETWORK_ADMINISTRATOR },
  { key: "STORE_MANAGER", label: "Gerente da loja", scope: "STORE", permissions: rolePermissions.STORE_MANAGER },
  { key: "RECEPTIONIST", label: "Recepção", scope: "STORE", permissions: rolePermissions.RECEPTIONIST },
  { key: "CLINICAL_PROFESSIONAL", label: "Profissional clínico", scope: "STORE", permissions: rolePermissions.CLINICAL_PROFESSIONAL },
  { key: "SELLER", label: "Vendas", scope: "STORE", permissions: rolePermissions.SELLER },
  { key: "CASHIER", label: "Caixa", scope: "STORE", permissions: rolePermissions.CASHIER },
  { key: "STOCK_MANAGER", label: "Estoque", scope: "STORE", permissions: rolePermissions.STOCK_MANAGER },
  { key: "FINANCE", label: "Financeiro", scope: "ORGANIZATION", permissions: rolePermissions.FINANCE },
  { key: "AUDITOR", label: "Consulta e relatórios", scope: "NETWORK", permissions: rolePermissions.AUDITOR }
];

export function hasPermission(role: RoleKey, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
