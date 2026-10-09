import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationService } from "./authentication-service";
import { generateSalt, hashPassword } from "./password";
import type { LocalSession, User } from "./access";

const sessions = { get: vi.fn(), save: vi.fn(), clear: vi.fn() };
const administration = { initialize: vi.fn(), listStores: vi.fn(), saveStore: vi.fn(), listUsers: vi.fn(), saveUser: vi.fn(), getCurrentStore: vi.fn(), saveCurrentStore: vi.fn() };
const service = new AuthenticationService(sessions, administration);

const salt = generateSalt();
const password = "senha-segura-123";
const seller: User = { id: "user-seller", name: "Vendedora Ana", email: "Ana@Opticore.LOCAL", role: "SELLER", scope: "STORE", storeIds: ["store-centro"], active: true, passwordSalt: salt, passwordHash: await hashPassword(password, salt) };
const owner: User = { id: "user-owner", name: "Administrador local", email: "admin@opticore.local", role: "OWNER", scope: "NETWORK", storeIds: ["store-centro"], active: true };
beforeEach(() => {
  vi.resetAllMocks();
  administration.listUsers.mockResolvedValue([owner, seller]);
  sessions.save.mockResolvedValue(undefined);
  sessions.clear.mockResolvedValue(undefined);
});

describe("password login", () => {
  it("opens an explicit session with issue date for the matching active user", async () => {
    const session = await service.login("  ana@opticore.local ", password);
    expect(session).toMatchObject({ id: "current", userName: "Vendedora Ana", role: "SELLER" });
    expect(session.demo).toBeUndefined();
    expect(Number.isNaN(Date.parse(session.issuedAt!))).toBe(false);
    expect(sessions.save).toHaveBeenCalledWith(session);
  });

  it("answers the same error for unknown e-mail, wrong password or missing credential", async () => {
    await expect(service.login("naoexiste@opticore.local", password)).rejects.toThrow("E-mail ou senha inválidos.");
    await expect(service.login("ana@opticore.local", "senha-errada")).rejects.toThrow("E-mail ou senha inválidos.");
    await expect(service.login("admin@opticore.local", password)).rejects.toThrow("E-mail ou senha inválidos.");
    expect(sessions.save).not.toHaveBeenCalled();
  });

  it("rejects empty inputs and inactive users after password check", async () => {
    await expect(service.login("", "")).rejects.toThrow("Informe e-mail e senha.");
    administration.listUsers.mockResolvedValue([{ ...seller, active: false }]);
    await expect(service.login("ana@opticore.local", password)).rejects.toThrow("Usuário inativo.");
    await expect(service.login("ana@opticore.local", "errada")).rejects.toThrow("E-mail ou senha inválidos.");
    expect(sessions.save).not.toHaveBeenCalled();
  });
});

describe("demo session", () => {
  it("is explicit, marked and limited to active users", async () => {
    const session = await service.loginDemo(seller.id);
    expect(session).toMatchObject({ userName: "Vendedora Ana", role: "SELLER", demo: true });
    administration.listUsers.mockResolvedValue([{ ...seller, active: false }]);
    await expect(service.loginDemo(seller.id)).rejects.toThrow("Usuário inativo.");
    await expect(service.loginDemo("user-missing")).rejects.toThrow("Usuário não encontrado.");
  });
});

describe("logout and password change", () => {
  it("clears the persisted session on logout", async () => {
    await service.logout();
    expect(sessions.clear).toHaveBeenCalledOnce();
  });

  it("changes the password verifying the current one and re-hashing", async () => {
    await expect(service.changePassword("Vendedora Ana", "senha-errada", "nova-senha-456")).rejects.toThrow("Senha atual incorreta.");
    await expect(service.changePassword("Vendedora Ana", password, "curta")).rejects.toThrow("ao menos 8");
    await service.changePassword("Vendedora Ana", password, "nova-senha-456");
    const saved = administration.saveUser.mock.calls[0][0] as User;
    expect(saved.passwordHash).not.toBe(seller.passwordHash);
    expect(saved.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    administration.listUsers.mockResolvedValue([saved]);
    await expect(service.login("ana@opticore.local", password)).rejects.toThrow("E-mail ou senha inválidos.");
    await expect(service.login("ana@opticore.local", "nova-senha-456")).resolves.toMatchObject({ userName: "Vendedora Ana" });
  });

  it("sets the first password without current one when the user has no credential yet", async () => {
    administration.listUsers.mockResolvedValue([owner]);
    await service.changePassword("Administrador local", "", "primeira-senha-9");
    expect(administration.saveUser).toHaveBeenCalledOnce();
    const saved = administration.saveUser.mock.calls[0][0] as User;
    expect(saved.passwordHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
