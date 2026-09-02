export type RoleKey = "ADMINISTRATOR" | "CLINICAL_PROFESSIONAL" | "RECEPTIONIST";

export type Permission =
  | "dashboard.view"
  | "settings.manage"
  | "users.manage"
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

export const rolePermissions: Readonly<Record<RoleKey, readonly Permission[]>> = {
  ADMINISTRATOR: ["dashboard.view", "settings.manage", "users.manage", "clinical.workspace.access"],
  CLINICAL_PROFESSIONAL: ["dashboard.view", "clinical.workspace.access"],
  RECEPTIONIST: ["dashboard.view"]
};

export function hasPermission(role: RoleKey, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
