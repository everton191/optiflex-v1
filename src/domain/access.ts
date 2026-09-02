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
  | "clinical.workspace.access";

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
  OWNER: ["dashboard.view", "stores.read", "stores.manage", "stores.select", "users.read", "users.manage", "settings.manage", "roles.read", "roles.manage", "clinical.workspace.access"],
  NETWORK_ADMINISTRATOR: ["dashboard.view", "stores.read", "stores.manage", "stores.select", "users.read", "users.manage", "settings.manage", "roles.read", "roles.manage"],
  STORE_MANAGER: ["dashboard.view", "stores.read", "stores.select", "users.read"],
  RECEPTIONIST: ["dashboard.view", "stores.read", "stores.select"],
  CLINICAL_PROFESSIONAL: ["dashboard.view", "stores.read", "stores.select", "clinical.workspace.access"],
  SELLER: ["dashboard.view", "stores.read", "stores.select"],
  CASHIER: ["dashboard.view", "stores.read", "stores.select"],
  STOCK_MANAGER: ["dashboard.view", "stores.read", "stores.select"],
  FINANCE: ["dashboard.view", "stores.read", "stores.select"],
  AUDITOR: ["dashboard.view", "stores.read"]
};

export const roleDefinitions: readonly RoleDefinition[] = [
  { key: "OWNER", label: "Proprietário / Super Admin", scope: "NETWORK", permissions: rolePermissions.OWNER },
  { key: "NETWORK_ADMINISTRATOR", label: "Administrador da rede", scope: "NETWORK", permissions: rolePermissions.NETWORK_ADMINISTRATOR },
  { key: "STORE_MANAGER", label: "Gerente da loja", scope: "STORE", permissions: rolePermissions.STORE_MANAGER },
  { key: "RECEPTIONIST", label: "Recepção", scope: "STORE", permissions: rolePermissions.RECEPTIONIST },
  { key: "CLINICAL_PROFESSIONAL", label: "Profissional clínico", scope: "STORE", permissions: rolePermissions.CLINICAL_PROFESSIONAL },
  { key: "SELLER", label: "Vendedor", scope: "STORE", permissions: rolePermissions.SELLER },
  { key: "CASHIER", label: "Caixa", scope: "STORE", permissions: rolePermissions.CASHIER },
  { key: "STOCK_MANAGER", label: "Estoquista", scope: "STORE", permissions: rolePermissions.STOCK_MANAGER },
  { key: "FINANCE", label: "Financeiro", scope: "ORGANIZATION", permissions: rolePermissions.FINANCE },
  { key: "AUDITOR", label: "Auditor", scope: "NETWORK", permissions: rolePermissions.AUDITOR }
];

export function hasPermission(role: RoleKey, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
