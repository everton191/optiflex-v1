import type { LocalSession, User } from "./access";
import type { AdministrationRepository, SessionRepository } from "./repositories";
import { assertPasswordStrength, generateSalt, hashPassword, verifyPassword } from "./password";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findUser(administration: AdministrationRepository, email: string): Promise<User | undefined> {
  const normalized = normalizeEmail(email);
  return (await administration.listUsers()).find((user) => normalizeEmail(user.email) === normalized);
}

async function startSession(sessions: SessionRepository, user: User, demo: boolean): Promise<LocalSession> {
  const session: LocalSession = { id: "current", userName: user.name, role: user.role, issuedAt: new Date().toISOString(), ...(demo ? { demo: true } : {}) };
  await sessions.save(session);
  return session;
}

export class AuthenticationService {
  constructor(private readonly sessions: SessionRepository, private readonly administration: AdministrationRepository) {}

  async login(email: string, password: string): Promise<LocalSession> {
    if (!normalizeEmail(email) || !password) throw new Error("Informe e-mail e senha.");
    const user = await findUser(this.administration, email);
    if (!user || !user.passwordHash || !user.passwordSalt) throw new Error("E-mail ou senha inválidos.");
    if (!(await verifyPassword(password, user.passwordSalt, user.passwordHash))) throw new Error("E-mail ou senha inválidos.");
    if (!user.active) throw new Error("Usuário inativo. Solicite a reativação.");
    return startSession(this.sessions, user, false);
  }

  async loginDemo(userId: string): Promise<LocalSession> {
    const user = (await this.administration.listUsers()).find((candidate) => candidate.id === userId);
    if (!user) throw new Error("Usuário não encontrado.");
    if (!user.active) throw new Error("Usuário inativo. Solicite a reativação.");
    return startSession(this.sessions, user, true);
  }

  async logout(): Promise<void> {
    await this.sessions.clear();
  }

  async changePassword(userName: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = (await this.administration.listUsers()).find((candidate) => candidate.name === userName);
    if (!user) throw new Error("Usuário da sessão não encontrado.");
    assertPasswordStrength(newPassword);
    if (user.passwordHash && user.passwordSalt && !(await verifyPassword(currentPassword, user.passwordSalt, user.passwordHash))) throw new Error("Senha atual incorreta.");
    const salt = generateSalt();
    await this.administration.saveUser({ ...user, passwordSalt: salt, passwordHash: await hashPassword(newPassword, salt) });
  }
}
