import { roleDefinitions, type CurrentStoreContext, type RoleKey, type Store, type User } from "./access";
import type { AdministrationRepository } from "./repositories";
import { assertPasswordStrength, generateSalt, hashPassword } from "./password";

export interface UserInput {
  name: string;
  email: string;
  role: RoleKey;
  storeIds: string[];
  password?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  constructor(private readonly repository: AdministrationRepository) {}
  async initialize(): Promise<void> { await this.repository.initialize(); }
  async listStores(): Promise<Store[]> { return this.repository.listStores(); }
  async listUsers(): Promise<User[]> { return this.repository.listUsers(); }
  async currentStore(): Promise<CurrentStoreContext> { return this.repository.getCurrentStore(); }
  async selectStore(storeId: string): Promise<void> {
    const store = (await this.repository.listStores()).find((item) => item.id === storeId && item.active);
    if (!store) throw new Error("Loja inválida ou inativa.");
    await this.repository.saveCurrentStore({ id: "current", storeId });
  }

  async createUser(input: UserInput): Promise<User> {
    const [users, stores] = await Promise.all([this.repository.listUsers(), this.repository.listStores()]);
    const credential = input.password ? await buildCredential(input.password) : undefined;
    const user: User = { id: `user-${crypto.randomUUID()}`, ...validateUserInput(input, users, stores), active: true, ...(credential ?? {}) };
    await this.repository.saveUser(user);
    return user;
  }

  async updateUser(id: string, input: UserInput): Promise<User> {
    const users = await this.repository.listUsers();
    const existing = users.find((user) => user.id === id);
    if (!existing) throw new Error("Usuário não encontrado.");
    const stores = await this.repository.listStores();
    const credential = input.password ? await buildCredential(input.password) : undefined;
    const user: User = { ...existing, ...validateUserInput(input, users, stores, id), ...(credential ?? {}) };
    await this.repository.saveUser(user);
    return user;
  }

  async setUserActive(id: string, active: boolean, currentUserName?: string): Promise<User> {
    const users = await this.repository.listUsers();
    const existing = users.find((user) => user.id === id);
    if (!existing) throw new Error("Usuário não encontrado.");
    if (!active && currentUserName && existing.name === currentUserName) throw new Error("Não é possível inativar o usuário da sessão atual.");
    const user: User = { ...existing, active };
    await this.repository.saveUser(user);
    return user;
  }
}
