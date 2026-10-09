import { roleDefinitions, type LocalSession, type RoleKey, type Scope, type User } from "./access";

export interface AccessContext {
  userName: string;
  role: RoleKey;
  scope: Scope;
  storeIds: readonly string[];
  currentStoreId: string;
}

export function buildAccessContext(session: LocalSession, users: readonly User[], currentStoreId: string): AccessContext {
  const scope = roleDefinitions.find((definition) => definition.key === session.role)?.scope ?? "SELF";
  const user = users.find((candidate) => candidate.name === session.userName);
  return { userName: session.userName, role: session.role, scope, storeIds: user?.storeIds ?? [], currentStoreId };
}

export function canAccessStore(context: AccessContext, storeId: string): boolean {
  if (context.scope === "NETWORK" || context.scope === "ORGANIZATION") return true;
  return context.storeIds.includes(storeId);
}

export function canAccessRecord(context: AccessContext, record: { storeId?: string; userId?: string }): boolean {
  if (context.scope === "NETWORK" || context.scope === "ORGANIZATION") return true;
  if (context.scope === "SELF") return record.userId !== undefined && record.userId === context.userName;
  return record.storeId === undefined ? true : context.storeIds.includes(record.storeId);
}

let activeContext: AccessContext | null = null;

export function setAccessContext(context: AccessContext | null): void {
  activeContext = context;
}

export function getActiveAccessContext(): AccessContext | null {
  return activeContext;
}

export function assertStoreAccess(storeId: string): void {
  if (activeContext && !canAccessStore(activeContext, storeId)) throw new Error("Acesso negado: você não tem acesso a esta loja.");
}

export function assertRecordAccess(record: { storeId?: string; userId?: string }): void {
  if (activeContext && !canAccessRecord(activeContext, record)) throw new Error("Acesso negado: este registro pertence a outra loja ou usuário.");
}
