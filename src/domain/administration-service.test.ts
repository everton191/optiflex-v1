import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdministrationService, type UserInput } from "./administration-service";
import type { Store, User } from "./access";

const repository = { initialize: vi.fn(), listStores: vi.fn(), saveStore: vi.fn(), listUsers: vi.fn(), saveUser: vi.fn(), getCurrentStore: vi.fn(), saveCurrentStore: vi.fn() };
const service = new AdministrationService(repository);
const stores: Store[] = [{ id: "store-centro", name: "Loja Centro", active: true }, { id: "store-shopping", name: "Loja Shopping", active: true }];
const owner: User = { id: "user-owner", name: "Administrador local", email: "admin@opticore.local", role: "OWNER", scope: "NETWORK", storeIds: ["store-centro", "store-shopping"], active: true };
const input: UserInput = { name: "  Ana Souza ", email: "Ana@Opticore.COM", role: "SELLER", storeIds: ["store-centro"] };
beforeEach(() => {
  vi.resetAllMocks();
  repository.listUsers.mockResolvedValue([owner]);
  repository.listStores.mockResolvedValue(stores);
  repository.saveUser.mockResolvedValue(undefined);
});

describe("user creation", () => {
  it("normalizes data, derives scope from the role and saves an active user", async () => {
    const created = await service.createUser(input);
    expect(created).toMatchObject({ name: "Ana Souza", email: "ana@opticore.com", role: "SELLER", scope: "STORE", storeIds: ["store-centro"], active: true });
    expect(created.id).toMatch(/^user-/);
    expect(repository.saveUser).toHaveBeenCalledWith(created);
  });

  it("rejects a blank name and an invalid e-mail", async () => {
    await expect(service.createUser({ ...input, name: "   " })).rejects.toThrow("Informe o nome do usuário.");
    await expect(service.createUser({ ...input, email: "ana@" })).rejects.toThrow("Informe um e-mail válido.");
    expect(repository.saveUser).not.toHaveBeenCalled();
  });

  it("rejects a duplicate e-mail regardless of case", async () => {
    await expect(service.createUser({ ...input, email: " ADMIN@Opticore.Local " })).rejects.toThrow("Já existe um usuário com este e-mail.");
    expect(repository.saveUser).not.toHaveBeenCalled();
  });

  it("rejects unknown roles and unknown stores", async () => {
    await expect(service.createUser({ ...input, role: "GHOST" as UserInput["role"] })).rejects.toThrow("Selecione uma função válida.");
    await expect(service.createUser({ ...input, storeIds: ["store-mall"] })).rejects.toThrow("Selecione lojas válidas.");
    expect(repository.saveUser).not.toHaveBeenCalled();
  });

  it("requires stores only for store-scoped roles and deduplicates stores", async () => {
    await expect(service.createUser({ ...input, storeIds: [] })).rejects.toThrow("Associe ao menos uma loja.");
    const network = await service.createUser({ name: "Beto", email: "beto@opticore.local", role: "OWNER", storeIds: [] });
    expect(network).toMatchObject({ scope: "NETWORK", storeIds: [] });
    const deduped = await service.createUser({ ...input, email: "ana2@opticore.local", storeIds: ["store-centro", "store-centro"] });
    expect(deduped.storeIds).toEqual(["store-centro"]);
  });
});

describe("user editing", () => {
  it("updates fields, re-derives scope and keeps identity and status", async () => {
    const created = await service.createUser(input);
    repository.listUsers.mockResolvedValue([owner, created]);
    const updated = await service.updateUser(created.id, { name: "Ana S.", email: "ana.nova@opticore.local", role: "CLINICAL_PROFESSIONAL", storeIds: ["store-centro", "store-shopping"] });
    expect(updated).toMatchObject({ id: created.id, active: true, name: "Ana S.", email: "ana.nova@opticore.local", role: "CLINICAL_PROFESSIONAL", scope: "STORE", storeIds: ["store-centro", "store-shopping"] });
    expect(repository.saveUser).toHaveBeenLastCalledWith(updated);
  });

  it("keeps the own e-mail when editing and rejects unknown ids", async () => {
    const updated = await service.updateUser(owner.id, { name: owner.name, email: "admin@opticore.local", role: "OWNER", storeIds: owner.storeIds });
    expect(updated).toMatchObject({ id: owner.id, email: "admin@opticore.local" });
    await expect(service.updateUser("user-missing", input)).rejects.toThrow("Usuário não encontrado.");
  });
});

describe("active status", () => {
  it("inactivates and reactivates users", async () => {
    const disabled = await service.setUserActive(owner.id, false, "Outro usuário");
    expect(disabled.active).toBe(false);
    const enabled = await service.setUserActive(owner.id, true, "Outro usuário");
    expect(enabled.active).toBe(true);
    expect(repository.saveUser).toHaveBeenCalledTimes(2);
  });

  it("protects the current session user and unknown ids", async () => {
    await expect(service.setUserActive(owner.id, false, owner.name)).rejects.toThrow("Não é possível inativar o usuário da sessão atual.");
    await expect(service.setUserActive("user-missing", false)).rejects.toThrow("Usuário não encontrado.");
    expect(repository.saveUser).not.toHaveBeenCalled();
  });
});

describe("credentials", () => {
  it("stores a salted hash and keeps it when the edit omits the password", async () => {
    const created = await service.createUser({ ...input, name: "Nova", email: "nova@opticore.local", password: "senha-segura-123" });
    expect(created.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    expect(created.passwordSalt).toBeTruthy();
    expect(JSON.stringify(created)).not.toContain("senha-segura-123");
    repository.listUsers.mockResolvedValue([owner, created]);
    const updated = await service.updateUser(created.id, { name: "Nova N.", email: created.email, role: created.role, storeIds: created.storeIds });
    expect(updated.passwordHash).toBe(created.passwordHash);
    expect(updated.passwordSalt).toBe(created.passwordSalt);
  });

  it("rejects weak passwords", async () => {
    await expect(service.createUser({ ...input, email: "fraca@opticore.local", password: "123" })).rejects.toThrow("ao menos 8");
    expect(repository.saveUser).not.toHaveBeenCalled();
  });
});
