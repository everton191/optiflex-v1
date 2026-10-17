import { defaultOrganization, roleDefinitions, type CurrentStoreContext, type RoleKey, type Store, type User } from "./access";
import type { AdministrationRepository } from "./repositories";
import type { AuditService } from "./audit-service";
import { assertPasswordStrength, generateSalt, hashPassword } from "./password";

export interface UserInput {
  name: string;
  email: string;
  role: RoleKey;
  storeIds: string[];
  password?: string;
}

export interface StoreInput {
  name: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function storeNameOf(input: StoreInput, stores: readonly Store[], excludeStoreId?: string): string {
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome da loja.");
  if (stores.some((store) => store.id !== excludeStoreId && store.name.trim().toLowerCase() === name.toLowerCase())) throw new Error("Já existe uma loja com este nome.");
  return name;
}

function validateUserInput(input: UserInput, users: readonly User[], stores: readonly Store[], excludeUserId?: string): Pick<User, "name" | "email" | "role" | "scope" | "storeIds"> {
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome do usuário.");
  const email = input.email.trim().toLowerCase();
  if (!emailPattern.test(email)) throw new Error("Informe um e-mail válido.");
  const definition = roleDefinitions.find((role) => role.key === input.role);
  if (!definition) throw new Error("Selecione uma função válida.");
  const storeIds = [...new Set(input.storeIds)];
  if (!storeIds.every((storeId) => stores.some((store) => store.id === storeId))) throw new Error("Selecione lojas válidas.");
  if (definition.scope === "STORE" && storeIds.length === 0) throw new Error("Associe ao menos uma loja.");
  if (users.some((user) => user.id !== excludeUserId && user.email.trim().toLowerCase() === email)) throw new Error("Já existe um usuário com este e-mail.");
  return { name, email, role: input.role, scope: definition.scope, storeIds };
}

async function buildCredential(password: string): Promise<Pick<User, "passwordHash" | "passwordSalt">> {
  assertPasswordStrength(password);
  const salt = generateSalt();
  return { passwordSalt: salt, passwordHash: await hashPassword(password, salt) };
}

export class AdministrationService {
  constructor(private readonly repository: AdministrationRepository, private readonly audit?: AuditService) {}
  async initialize(): Promise<void> { await this.repository.initialize(); }
  async listStores(): Promise<Store[]> { return this.repository.listStores(); }
  async listUsers(): Promise<User[]> { return this.repository.listUsers(); }
  async currentStore(): Promise<CurrentStoreContext> { return this.repository.getCurrentStore(); }
  async selectStore(storeId: string): Promise<void> {
    const store = (await this.repository.listStores()).find((item) => item.id === storeId && item.active);
    if (!store) throw new Error("Loja inválida ou inativa.");
    await this.repository.saveCurrentStore({ id: "current", storeId });
  }

  async createStore(input: StoreInput, author?: string): Promise<Store> {
    const stores = await this.repository.listStores();
    const store: Store = { id: `store-${crypto.randomUUID()}`, name: storeNameOf(input, stores), active: true, organizationId: defaultOrganization.id };
    await this.repository.saveStore(store);
    await this.audit?.log({ storeId: store.id, action: "CREATE", entity: "store", entityId: store.id, author: author ?? "", summary: store.name });
    return store;
  }

  async updateStore(id: string, input: StoreInput, author?: string): Promise<Store> {
    const stores = await this.repository.listStores();
    const existing = stores.find((store) => store.id === id);
    if (!existing) throw new Error("Loja não encontrada.");
    const store: Store = { ...existing, name: storeNameOf(input, stores, id) };
    await this.repository.saveStore(store);
    await this.audit?.log({ storeId: id, action: "UPDATE", entity: "store", entityId: id, author: author ?? "", summary: existing.name === store.name ? store.name : `${existing.name} → ${store.name}` });
    return store;
  }

  async setStoreActive(id: string, active: boolean, author?: string): Promise<Store> {
    const stores = await this.repository.listStores();
    const existing = stores.find((store) => store.id === id);
    if (!existing) throw new Error("Loja não encontrada.");
    if (existing.active === active) return existing;
    if (!active) {
      if (stores.filter((store) => store.active).length <= 1) throw new Error("Mantenha ao menos uma loja ativa.");
      const current = await this.repository.getCurrentStore();
      if (current.storeId === id) throw new Error("Troque de loja antes de inativar a loja atual.");
    }
    const store: Store = { ...existing, active };
    await this.repository.saveStore(store);
    await this.audit?.log({ storeId: id, action: "UPDATE", entity: "store", entityId: id, author: author ?? "", summary: active ? "reativada" : "inativada" });
    return store;
  }

  async createUser(input: UserInput, author?: string): Promise<User> {
    const [users, stores] = await Promise.all([this.repository.listUsers(), this.repository.listStores()]);
    const credential = input.password ? await buildCredential(input.password) : undefined;
    const user: User = { id: `user-${crypto.randomUUID()}`, organizationId: defaultOrganization.id, ...validateUserInput(input, users, stores), active: true, ...(credential ?? {}) };
    await this.repository.saveUser(user);
    await this.audit?.log({ storeId: user.storeIds[0] ?? defaultOrganization.id, action: "CREATE", entity: "user", entityId: user.id, author: author ?? "", summary: `${user.name} (${user.role})` });
    return user;
  }

  async updateUser(id: string, input: UserInput, author?: string): Promise<User> {
    const users = await this.repository.listUsers();
    const existing = users.find((user) => user.id === id);
    if (!existing) throw new Error("Usuário não encontrado.");
    const stores = await this.repository.listStores();
    const credential = input.password ? await buildCredential(input.password) : undefined;
    const user: User = { ...existing, ...validateUserInput(input, users, stores, id), ...(credential ?? {}) };
    await this.repository.saveUser(user);
    const changed: string[] = (["name", "email", "role", "scope"] as const).filter((field) => existing[field] !== user[field]);
    if (existing.storeIds.join(",") !== user.storeIds.join(",")) changed.push("storeIds");
    await this.audit?.log({ storeId: user.storeIds[0] ?? defaultOrganization.id, action: "UPDATE", entity: "user", entityId: user.id, author: author ?? "", summary: changed.length ? `campos: ${changed.join(", ")}` : user.name });
    return user;
  }

  async setUserActive(id: string, active: boolean, currentUserName?: string, author?: string): Promise<User> {
    const users = await this.repository.listUsers();
    const existing = users.find((user) => user.id === id);
    if (!existing) throw new Error("Usuário não encontrado.");
    if (!active && currentUserName && existing.name === currentUserName) throw new Error("Não é possível inativar o usuário da sessão atual.");
    const user: User = { ...existing, active };
    await this.repository.saveUser(user);
    await this.audit?.log({ storeId: user.storeIds[0] ?? defaultOrganization.id, action: "UPDATE", entity: "user", entityId: user.id, author: author ?? currentUserName ?? "", summary: active ? "reativado" : "inativado" });
    return user;
  }
}
